require('dotenv').config();
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
    cb(null, Date.now() + "-" + Math.round(Math.random() * 100000) + path.extname(file.originalname));
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
      try {
        data = (() => { try { return JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch(e) { console.error('Error parsing JSON', e); return []; } })();
      } catch(e) {
        console.error("Corrupted data.json, starting fresh", e);
        data = [];
      }
    }
    // Assurer que "likes" et "comments" existent
    data = data.map(ep => ({...ep, likes: ep.likes || 0, comments: ep.comments || []}));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read data.json' });
  }
});

// Route pour générer un épisode via IA
app.post('/api/generate', async (req, res) => {
  try {
    const { title, author, description, text, voice } = req.body;
    if (!title || typeof title !== 'string' || !text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Title and text are required' });
    }
    
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      return res.status(500).json({ error: 'REPLICATE_API_TOKEN is not configured' });
    }

    // Appel à Replicate Minimax
    const inputPayload = { text: text };
    if (voice) inputPayload.voice = voice;

    const response = await fetch('https://api.replicate.com/v1/models/minimax/speech-02-turbo/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: inputPayload })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Replicate API error:', errText);
      return res.status(500).json({ error: 'Error calling Replicate API', details: errText });
    }

    let prediction;
    try {
      prediction = await response.json();
    } catch (e) {
      console.error('Failed to parse Replicate response', e);
      return res.status(500).json({ error: 'Invalid JSON from Replicate API' });
    }
    
    if (!prediction || !prediction.urls || !prediction.urls.get) {
      return res.status(500).json({ error: 'Invalid response structure from Replicate', details: prediction });
    }
    const getUrl = prediction.urls.get;

    // Polling until finished
    let maxRetries = 60; // Max 2 minutes
    while (['starting', 'processing'].includes(prediction.status) && maxRetries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(getUrl, {
        headers: { 'Authorization': `Bearer ${replicateToken}` }
      });
      if (!pollRes.ok) {
        throw new Error(`Polling request failed: ${pollRes.statusText}`);
      }
      prediction = await pollRes.json();
      maxRetries--;
    }
    
    if (maxRetries === 0) {
      return res.status(504).json({ error: 'Replicate prediction timed out' });
    }

    if (prediction.status === 'failed') {
      return res.status(500).json({ error: 'Replicate prediction failed', details: prediction.error });
    }

    const audioUrl = typeof prediction.output === 'string' ? prediction.output : (Array.isArray(prediction.output) ? prediction.output[0] : prediction.output);
    if (!audioUrl) {
      return res.status(500).json({ error: 'No audio output received from Replicate' });
    }

    // Téléchargement du MP3
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Failed to download audio file: ${audioRes.status} ${audioRes.statusText}`);
    const buffer = await audioRes.arrayBuffer();
    const filename = Date.now() + '-' + Math.round(Math.random() * 100000) + '.mp3';
    const filepath = path.join(__dirname, 'public/episodes', filename);
    if (!fs.existsSync(path.dirname(filepath))) {
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
    }
    fs.writeFileSync(filepath, Buffer.from(buffer));

    // Mise à jour de data.json
    const dataPath = path.join(__dirname, 'data.json');
    let data = [];
    if (fs.existsSync(dataPath)) {
      data = (() => { try { return JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch(e) { console.error('Error parsing JSON', e); return []; } })();
    }
    
    const newEpisode = {
      id: data.length > 0 ? Math.max(...data.map(e => e.id)) + 1 : 1,
      title: title,
      description: description || '',
      audio: '/episodes/' + filename,
      author: author || 'IA',
      likes: 0,
      comments: []
    };
    
    data.push(newEpisode);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    res.json({ success: true, episode: newEpisode });
  } catch (error) {
    console.error('Erreur /api/generate:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
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
      data = (() => { try { return JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch(e) { console.error('Error parsing JSON', e); return []; } })();
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
    const data = (() => { try { return JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch(e) { console.error('Error parsing JSON', e); return []; } })();
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
    const data = (() => { try { return JSON.parse(fs.readFileSync(dataPath, 'utf8')); } catch(e) { console.error('Error parsing JSON', e); return []; } })();
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
