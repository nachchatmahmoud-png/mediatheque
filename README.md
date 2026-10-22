# Médiathèque — GitHub Pages

Le site public et son espace de gestion sont hébergés dans ce dépôt et publiés sur GitHub Pages.

- Français : https://nachchatmahmoud-png.github.io/mediatheque/fr/
- العربية : https://nachchatmahmoud-png.github.io/mediatheque/ar/
- Gestion : https://nachchatmahmoud-png.github.io/mediatheque/fr/?view=manage

Les pages française et arabe disposent de leurs propres textes, résultats et événements. L’interface arabe se lit de droite à gauche. L’espace de gestion commun est en français et reste sur la même adresse GitHub Pages.

## Tester l’espace de gestion

**Mode test ouvert sans connexion.** Ouvrez le lien Gestion, sélectionnez un support, renseignez les champs et cliquez sur **Valider et publier**. Le contenu apparaît dans l’accueil de la langue choisie, uniquement dans le même navigateur. Les fichiers et miniatures sont conservés localement avec IndexedDB, y compris après rechargement et passage entre les pages française et arabe. Le bouton **Effacer les contenus de test** supprime ces essais locaux.

Ce mode ne transmet aucun fichier ni aucune publication à un serveur ou au dépôt GitHub. Les lecteurs des autres navigateurs ne voient pas vos essais. Le site doit pouvoir enregistrer ses données dans votre navigateur ; l’effacement des données du site supprime aussi les essais.

Le choix est explicite dans `interface/service-config.json` : `management.mode` vaut `test`. Le client local est distinct du service de publication. Pour la future mise en production, sélectionner `production` et connecter un service sécurisé avant d’activer les comptes.

## Accès des administrateurs en production

Le formulaire demande un **identifiant** et un **mot de passe** personnels. Les pages restent sur GitHub Pages. Les mots de passe et les droits de publication doivent être vérifiés par un service sécurisé ; aucune clé GitHub n’est demandée aux administrateurs ou embarquée dans le site.

**Service de production non connecté, comptes non activés.** La connexion est reportée pendant les essais. Les quatre personnes prévues sont Katiri Abdelah, Rbina Abdelah, Nachchat Mahmoud et Ilham Boudil. Aucun mot de passe de ces personnes n’a été créé ou publié dans le dépôt.

L’adresse HTTPS du service se renseigne dans `interface/service-config.json`, champ `authentication.apiBase`, après son déploiement. Le code du serveur, les profils demandés, les scripts de préparation et les conditions d’activation sont disponibles dans `administration/`. Les mots de passe initiaux ne sont créés que lors de la configuration privée du service et doivent être remplacés à la première connexion. Le jeton de session reste uniquement en mémoire et expire après 30 minutes d’inactivité, au plus tard à l’expiration imposée par le serveur.

## Publier un contenu

1. Ouvrir **Espace de gestion**. En mode test, le formulaire s’ouvre directement.
2. Choisir **Vidéo**, **Photos** ou **Communiqué de presse**. Chaque support possède son formulaire et sa saisie indépendante pendant le passage entre les trois choix.
3. Renseigner les champs propres au support, la page de publication et la rubrique, puis sélectionner les fichiers.
4. Vérifier l’aperçu, puis cliquer sur **Valider et publier**.

Les mots-clés nécessaires à l’indexation sont renseignés à partir de la rubrique. Les informations facultatives sont regroupées. Pour les vidéos, la langue parlée est distincte de la langue de la fiche. Un bref résumé français est demandé pour présenter une vidéo en arabe sur la page française.

Le formulaire **Vidéo** demande son titre, sa date de diffusion, le fichier ou le lien, la miniature et la langue parlée ; le résumé, les crédits et les sous-titres sont adaptés à la langue choisie. Le formulaire **Photos** propose le titre de l’album, la date des prises de vue, les photographies, leur couverture et leurs légendes ; le lieu et le crédit photographique sont facultatifs. Le formulaire **Communiqué de presse** propose le titre, la date du communiqué et un choix entre PDF, texte intégral ou texte et PDF ; le chapeau et le service émetteur sont facultatifs. Seul le contenu du format sélectionné est joint à la publication.

Après connexion du service, celui-ci devra enregistrer les fichiers et la fiche ensemble dans `publications/` par un seul commit. GitHub Actions vérifie et publie le catalogue. Le formulaire attend la présence effective du contenu dans le catalogue public avant d’annoncer sa mise en ligne. Une nouvelle tentative conserve le même identifiant de requête pour éviter les doublons côté serveur.

## Miniatures et sous-titres

Une miniature est extraite automatiquement de la vidéo importée et s’affiche dès son chargement, avant publication. Le volet **Choisir une autre image dans la vidéo** permet de déplacer le curseur du lecteur puis de cliquer sur **Utiliser cette image comme miniature**. Une image personnalisée peut aussi être importée. Un lien YouTube fournit sa miniature. Pour un album, l’administrateur choisit la photo de couverture indépendamment de l’ordre des photos.

Pour une vidéo importée, les sous-titres WebVTT peuvent être joints et vérifiés dans l’aperçu. Pour YouTube, ils doivent être publiés sur la vidéo dans YouTube Studio. La mention de sous-titres français ou arabes apparaît seulement lorsque l’administrateur a déclaré leur disponibilité et confirmé leur validation.

La dernière vidéo de la chaîne officielle `@Matnuhpv` est actualisée par GitHub Actions aux minutes 13 et 43 de chaque heure. La page française reprend la traduction du titre YouTube ; la page arabe conserve son titre d’origine. Les titres traduits et résumés français validés sont associés à l’identifiant exact de la vidéo dans `site/video-localizations.json`. Sans traduction renseignée pour une nouvelle vidéo, son titre d’origine est affiché. Aucun titre générique ne le remplace. L’audio d’origine est conservé ; le site ne traduit pas automatiquement les propos.

## Formats et limites

- Photos : JPG, PNG ou WebP, 30 photos maximum et 12 Mio par photo.
- Vidéo : MP4 ou WebM jusqu’à 25 Mio, ou lien HTTPS.
- Communiqué : PDF jusqu’à 20 Mio, texte ou les deux.
- Sous-titres : WebVTT jusqu’à 1 Mio.
- Publication complète : 100 Mio de fichiers maximum.

Les fichiers sont validés avant l’enregistrement. Les essais restent dans le navigateur ; les publications de production seront également contrôlées par le générateur du catalogue avant leur diffusion publique.

## Source et vérifications

Les composants éditables se trouvent dans `interface/`. `scripts/build-interface.mjs` les assemble avec le runtime React conservé dans `site/assets/app.js`. `scripts/build-github-pages.mjs` génère `_site/` et valide les dossiers de `publications/`. Le mode test fonctionne entièrement dans le navigateur.

Avec Node.js 22.13 ou ultérieur et Python 3 :

```sh
npm test
npm run build
```

Le workflow `.github/workflows/pages.yml` exécute ces contrôles avant chaque publication GitHub Pages. Les tests couvrent notamment l’isolation des langues, les fichiers, l’accès GitHub, l’enregistrement des trois supports, les publications simultanées, la reprise après échec et les miniatures.
