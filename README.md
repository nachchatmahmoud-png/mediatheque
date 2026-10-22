# Médiathèque — GitHub Pages

Le site public et son espace de gestion sont hébergés dans ce dépôt et publiés sur GitHub Pages.

- Français : https://nachchatmahmoud-png.github.io/mediatheque/fr/
- العربية : https://nachchatmahmoud-png.github.io/mediatheque/ar/
- Gestion : https://nachchatmahmoud-png.github.io/mediatheque/fr/?view=manage

Les pages française et arabe disposent de leurs propres textes, résultats et événements. L’interface arabe se lit de droite à gauche. L’espace de gestion commun est en français et reste sur la même adresse GitHub Pages.

## Accès des administrateurs

L’identité et le droit de publication sont vérifiés par l’API GitHub. Le compte doit disposer du droit d’écriture dans `nachchatmahmoud-png/mediatheque`. Le formulaire demande une clé personnelle GitHub, conservée uniquement en mémoire pendant l’onglet ouvert, effacée à la déconnexion ou après 30 minutes d’inactivité. La clé est transmise uniquement à `api.github.com`, jamais au catalogue public, à une URL, au stockage du navigateur ou aux fichiers publiés.

Pour le propriétaire : utiliser une clé fine, limitée à ce dépôt, avec `Contents: Read and write` et une date d’expiration. Pour un collaborateur du dépôt personnel d’un autre utilisateur, les limitations actuelles de GitHub nécessitent une clé classique avec le droit minimal `public_repo` et une date d’expiration. Les liens et les indications sont disponibles sous « Première connexion : préparer mon accès ».

Les habilitations s’accordent dans les paramètres d’accès du dépôt GitHub. Aucun mot de passe partagé, mot de passe d’administrateur ou secret permanent n’est embarqué dans le site.

## Publier un contenu

1. Ouvrir **Espace de gestion** et se connecter avec son accès GitHub.
2. Choisir **Vidéothèque**, **Photothèque** ou **Espace médias**.
3. Renseigner le titre, la date, la page de publication et la rubrique, puis sélectionner les supports.
4. Vérifier l’aperçu, puis cliquer sur **Valider et publier**.

Les mots-clés nécessaires à l’indexation sont renseignés à partir de la rubrique. Les informations facultatives sont regroupées. Pour les vidéos, la langue parlée est distincte de la langue de la fiche. Un bref résumé français est demandé pour présenter une vidéo en arabe sur la page française.

Les fichiers et la fiche sont enregistrés ensemble dans `publications/` par un seul commit. GitHub Actions vérifie et publie le catalogue. Le formulaire suit la mise en ligne et retourne à l’accueil lorsque la nouvelle publication y est effectivement présente. Cette étape peut prendre quelques minutes. Une nouvelle tentative conserve la publication déjà enregistrée et évite les doublons. Les mises à jour simultanées de plusieurs administrateurs sont reprises sans écraser leurs modifications.

## Miniatures et sous-titres

Une miniature est créée à partir d’une vidéo importée et peut être remplacée. Un lien YouTube fournit sa miniature ; une image personnalisée peut également être importée. Pour un album, l’administrateur choisit la photo de couverture indépendamment de l’ordre des photos.

Pour une vidéo importée, les sous-titres WebVTT peuvent être joints et vérifiés dans l’aperçu. Pour YouTube, ils doivent être publiés sur la vidéo dans YouTube Studio. La mention de sous-titres français ou arabes apparaît seulement lorsque l’administrateur a déclaré leur disponibilité et confirmé leur validation.

La dernière vidéo de la chaîne officielle `@Matnuhpv` est actualisée par GitHub Actions aux minutes 13 et 43 de chaque heure. Les présentations françaises validées sont associées à l’identifiant exact de la vidéo dans `site/video-localizations.json`. Elles ne sont jamais réutilisées pour une autre vidéo. L’audio d’origine est conservé ; le site ne traduit pas automatiquement les propos.

## Formats et limites

- Photos : JPG, PNG ou WebP, 30 photos maximum et 12 Mio par photo.
- Vidéo : MP4 ou WebM jusqu’à 25 Mio, ou lien HTTPS.
- Communiqué : PDF jusqu’à 20 Mio, texte ou les deux.
- Sous-titres : WebVTT jusqu’à 1 Mio.
- Publication complète : 100 Mio de fichiers maximum.

Les fichiers sont validés avant l’enregistrement et à nouveau par le générateur du catalogue. Les contenus validés sont destinés à une diffusion publique sur le site et dans le dépôt GitHub.

## Source et vérifications

Les composants éditables se trouvent dans `interface/`. `scripts/build-interface.mjs` les assemble avec le runtime React conservé dans `site/assets/app.js`. `scripts/build-github-pages.mjs` génère `_site/` et valide les dossiers de `publications/`. Aucun serveur d’authentification distinct n’est nécessaire.

Avec Node.js 22.13 ou ultérieur et Python 3 :

```sh
npm test
npm run build
```

Le workflow `.github/workflows/pages.yml` exécute ces contrôles avant chaque publication GitHub Pages. Les tests couvrent notamment l’isolation des langues, les fichiers, l’accès GitHub, l’enregistrement des trois supports, les publications simultanées, la reprise après échec et les miniatures.
