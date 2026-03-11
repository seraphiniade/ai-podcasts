const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'public/episodes');
    if (!fs.existsSync(dir)){ fs.mkdirSync(dir, { recursive: true }); }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', project: 'AI-Podcasts', message: 'Backend is running smoothly.' });
});

app.get('/api/episodes', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    let data = [];
    if (fs.existsSync(dataPath)) {
      data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
    // Assurer que "likes" et "comments" existent
    data = data.map(ep => ({...ep, likes: ep.likes || 0, comments: ep.comments || []}));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data.json' });
  }
});

// Route pour liker un épisode

app.post('/api/episodes', upload.single('audioFile'), (req, res) => {
  try {
    const { title, description, author } = req.body;
    if (!req.file || !title) {
      return res.status(400).json({ error: 'Title and audio file are required' });
    }
    const dataPath = path.join(__dirname, 'data.json');
    let data = [];
    if (fs.existsSync(dataPath)) {
      data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
    const newEpisode = {
      id: data.length > 0 ? Math.max(...data.map(e => e.id)) + 1 : 1,
      title: title,
      description: description || 'No description provided.',
      audio: '/episodes/' + req.file.filename,
      author: author || 'Anonyme',
      likes: 0,
      comments: []
    };
    data.push(newEpisode);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    res.json({ success: true, episode: newEpisode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload episode' });
  }
});

// Route pour liker un épisode
app.post('/api/episodes/:id/like', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const episode = data.find(e => e.id == req.params.id);
    if (episode) {
      episode.likes = (episode.likes || 0) + 1;
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      res.json({ success: true, likes: episode.likes });
    } else {
      res.status(404).json({ error: 'Episode not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Route pour ajouter un commentaire
app.post('/api/episodes/:id/comment', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const episode = data.find(e => e.id == req.params.id);
    if (episode && req.body.text) {
      episode.comments = episode.comments || [];
      episode.comments.push({ author: req.body.author || 'Anonyme', text: req.body.text });
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      res.json({ success: true, comments: episode.comments });
    } else {
      res.status(400).json({ error: 'Invalid request' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
