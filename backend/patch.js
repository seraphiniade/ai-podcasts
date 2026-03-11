const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

if (!code.includes("app.post('/api/podcasts',")) {
  const insertIndex = code.indexOf("app.listen(");
  const newEndpoint = `
app.post('/api/podcasts', (req, res) => {
  const { title, author, duration, audioUrl, description } = req.body;
  const newPodcast = {
    id: podcasts.length > 0 ? Math.max(...podcasts.map(p => p.id)) + 1 : 1,
    title,
    author,
    duration,
    audioUrl,
    likes: 0,
    description
  };
  podcasts.push(newPodcast);
  res.status(201).json(newPodcast);
});

`;
  code = code.slice(0, insertIndex) + newEndpoint + code.slice(insertIndex);
  fs.writeFileSync('server.js', code);
}
