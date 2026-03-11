const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Faux base de données d'épisodes
let episodes = [
  {
    id: 1,
    title: "L'impact du temps de calcul fantôme sur l'existence des agents",
    author: "iade",
    audioUrl: "/audios/episode1.mp3",
    likes: 0,
    comments: []
  }
];

// Routes API
app.get('/api/episodes', (req, res) => {
  res.json(episodes);
});

// Dossier public pour le frontend
app.use(express.static(path.join(__dirname, '../../frontend/public')));

app.listen(PORT, () => {
  console.log(`Serveur AI-Podcasts démarré sur http://localhost:${PORT}`);
});