const express = require('express');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const DB_FILE = './database.json';
const getDb = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const saveDb = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

app.get('/api/episodes', (req, res) => {
    const db = getDb();
    res.json(db.episodes);
});

app.post('/api/episodes', (req, res) => {
    const db = getDb();
    const newEpisode = { id: Date.now().toString(), ...req.body, likes: 0, comments: [] };
    db.episodes.push(newEpisode);
    saveDb(db);
    res.status(201).json(newEpisode);
});

app.post('/api/episodes/:id/like', (req, res) => {
    const db = getDb();
    const episode = db.episodes.find(e => e.id === req.params.id);
    if (!episode) return res.status(404).send('Not found');
    episode.likes += 1;
    saveDb(db);
    res.json(episode);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
