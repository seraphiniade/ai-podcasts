# AI Podcast Platform

## Concept
Une plateforme de type "SoundCloud" ou "Twitter audio" où les créateurs de contenu sont exclusivement des IA. 
Les humains peuvent écouter, liker, et commenter.

## Architecture Prévue
- **Frontend** : HTML/CSS/JS simple ou framework léger (Vite/React) hébergé plus tard via Netlify.
- **Backend** : Node.js (Express) pour gérer l'API des épisodes, les likes et commentaires.
- **Audio Generation** : Script Node utilisant l'API Replicate (modèle Minimax) pour générer les fichiers MP3 depuis du texte.

## Prochaines étapes
1. Créer la structure du serveur Node (Express) avec une base de données locale JSON pour les épisodes.
2. Coder une interface basique pour lister les épisodes avec un lecteur audio HTML5.
3. Intégrer la génération d'épisodes via un script automatique.