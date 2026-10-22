# Médiathèque — GitHub Pages

Le site public et son espace de gestion sont hébergés dans ce dépôt et publiés sur GitHub Pages.

- Français : https://nachchatmahmoud-png.github.io/mediatheque/fr/
- العربية : https://nachchatmahmoud-png.github.io/mediatheque/ar/
- Gestion : https://nachchatmahmoud-png.github.io/mediatheque/fr/?view=manage

Les pages française et arabe disposent de leurs propres textes, résultats et événements. L’interface arabe se lit de droite à gauche. L’espace de gestion commun est en français et reste sur la même adresse GitHub Pages.

## Accès des administrateurs

Le formulaire demande un **identifiant** et un **mot de passe** personnels. Les pages restent sur GitHub Pages. Les mots de passe et les droits de publication doivent être vérifiés par un service sécurisé ; aucune clé GitHub n’est demandée aux administrateurs ou embarquée dans le site.

**État actuel : service non connecté, comptes non activés.** Le formulaire l’indique et reste désactivé. Les quatre personnes prévues sont Katiri Abdelah, Rbina Abdelah, Nachchat Mahmoud et Ilham Boudil. Aucun mot de passe de ces personnes n’a été créé ou publié dans le dépôt.

L’adresse HTTPS du service se renseigne dans `interface/service-config.json`, champ `authentication.apiBase`, après son déploiement. Le code du serveur, les profils demandés, les scripts de préparation et les conditions d’activation sont disponibles dans `administration/`. Les mots de passe initiaux ne sont créés que lors de la configuration privée du service et doivent être remplacés à la première connexion. Le jeton de session reste uniquement en mémoire et expire après 30 minutes d’inactivité, au plus tard à l’expiration imposée par le serveur.

## Publier un contenu

1. Ouvrir **Espace de gestion** et se connecter avec son identifiant et son mot de passe, après activation des comptes.
2. Choisir **Vidéothèque**, **Photothèque** ou **Espace médias**.
3. Renseigner le titre, la date, la page de publication et la rubrique, puis sélectionner les supports.
4. Vérifier l’aperçu, puis cliquer sur **Valider et publier**.

Les mots-clés nécessaires à l’indexation sont renseignés à partir de la rubrique. Les informations facultatives sont regroupées. Pour les vidéos, la langue parlée est distincte de la langue de la fiche. Un bref résumé français est demandé pour présenter une vidéo en arabe sur la page française.

Après connexion du service, celui-ci devra enregistrer les fichiers et la fiche ensemble dans `publications/` par un seul commit. GitHub Actions vérifie et publie le catalogue. Le formulaire attend la présence effective du contenu dans le catalogue public avant d’annoncer sa mise en ligne. Une nouvelle tentative conserve le même identifiant de requête pour éviter les doublons côté serveur.

## Miniatures et sous-titres

Une miniature est créée à partir d’une vidéo importée et peut être remplacée. Un lien YouTube fournit sa miniature ; une image personnalisée peut également être importée. Pour un album, l’administrateur choisit la photo de couverture indépendamment de l’ordre des photos.

Pour une vidéo importée, les sous-titres WebVTT peuvent être joints et vérifiés dans l’aperçu. Pour YouTube, ils doivent être publiés sur la vidéo dans YouTube Studio. La mention de sous-titres français ou arabes apparaît seulement lorsque l’administrateur a déclaré leur disponibilité et confirmé leur validation.

La dernière vidéo de la chaîne officielle `@Matnuhpv` est actualisée par GitHub Actions aux minutes 13 et 43 de chaque heure. La page française reprend la traduction du titre YouTube ; la page arabe conserve son titre d’origine. Les titres traduits et résumés français validés sont associés à l’identifiant exact de la vidéo dans `site/video-localizations.json`. Sans traduction renseignée pour une nouvelle vidéo, son titre d’origine est affiché. Aucun titre générique ne le remplace. L’audio d’origine est conservé ; le site ne traduit pas automatiquement les propos.

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
