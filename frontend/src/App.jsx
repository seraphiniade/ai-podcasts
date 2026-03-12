import { useState, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';

function App() {
  const [podcasts, setPodcasts] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/episodes')
      .then(res => res.json())
      .then(data => setPodcasts(data.reverse()))
      .catch(console.error);
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const title = formData.get('title');
    const script = formData.get('script');
    const voice = formData.get('voice');
    
    if (!title || !script) return alert('Titre et script requis !');

    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text: script, voice })
      });
      const data = await res.json();
      if (data.success && data.episode) {
        setPodcasts([data.episode, ...podcasts]);
      } else {
        alert('Erreur lors de la génération : ' + (data.error || 'Inconnue'));
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau.');
    } finally {
      setIsGenerating(false);
      e.target.reset();
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto flex flex-col items-center">
      <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
        AI Podcasts
      </h1>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Generate Column */}
        <div className="bg-slate-800/80 p-6 rounded-2xl shadow-xl border border-slate-700/50 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold mb-2">🎙️ Créer un épisode</h2>
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Titre de l'épisode</label>
              <input
                name="title"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                placeholder="Ex: La révolution de l'IA"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Script complet</label>
              <textarea
                name="script"
                rows="4"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow resize-none"
                placeholder="Entrez le script du podcast..."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Voix</label>
              <select name="voice" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="kurzgesagt">Kurzgesagt (Documentaire)</option>
                <option value="leo_tobey">Leo / Tobey (Conversationnel)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isGenerating}
              className={`mt-4 w-full font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 ${
                isGenerating 
                  ? 'bg-slate-600 cursor-not-allowed opacity-70' 
                  : 'bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-lg shadow-indigo-500/25'
              }`}
            >
              {isGenerating ? 'Génération en cours...' : 'Générer l\'audio 🚀'}
            </button>
          </form>
        </div>

        {/* Feed Column */}
        <div className="bg-slate-800/80 p-6 rounded-2xl shadow-xl border border-slate-700/50 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold mb-2">🎧 Fil d'actualité</h2>
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {podcasts.length === 0 ? (
              <p className="text-slate-400 text-center mt-8">Aucun podcast. Générez-en un !</p>
            ) : (
              podcasts.map((p) => (
                <div key={p.id} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors group">
                  <h3 className="text-lg font-bold text-cyan-300">{p.title}</h3>
                  <p className="text-sm text-slate-400 mb-2">Par <b>{p.author || 'AI'}</b> • {p.duration}</p>
                  <p className="text-sm text-slate-300 mb-4 line-clamp-2">{p.description}</p>
                  <button
                    onClick={() => setSelectedAudio(p.audioUrl)}
                    className="w-full py-2 bg-indigo-500/10 text-indigo-400 font-semibold rounded-lg hover:bg-indigo-500/20 transition-colors border border-indigo-500/20"
                  >
                    Écouter
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Audio Player */}
      {selectedAudio && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 animate-fade-in-up">
          <AudioPlayer audioUrl={selectedAudio} onClose={() => setSelectedAudio(null)} />
        </div>
      )}
    </div>
  );
}

export default App;