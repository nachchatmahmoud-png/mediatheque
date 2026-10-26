# Médiathèque — GitHub Pages

Le site public et son espace de gestion sont hébergés dans ce dépôt et publiés sur GitHub Pages.

- Français : https://nachchatmahmoud-png.github.io/mediatheque/fr/
- العربية : https://nachchatmahmoud-png.github.io/mediatheque/ar/
- Gestion : https://nachchatmahmoud-png.github.io/mediatheque/fr/?view=manage

Les pages française et arabe disposent de leurs propres textes, résultats et événements. L’interface arabe se lit de droite à gauche. L’espace de gestion commun est en français et reste sur la même adresse GitHub Pages.

## Accès local à l’espace de gestion

Le mode test sans connexion est désactivé. **Créer mon accès** permet de choisir un identifiant et un mot de passe, puis **Se connecter** ouvre les formulaires de gestion. Lorsqu’un accès existe dans ce navigateur, seule la connexion est proposée. Aucun mot de passe prédéfini n’est fourni ou placé dans le dépôt.

Le compte et les contenus ajoutés sont **limités à ce navigateur**. Ils ne sont pas synchronisés entre les ordinateurs et les ajouts ne sont pas publiés pour les autres visiteurs. Cette limite est indiquée dans le formulaire et dans la gestion. Les données d’anciens essais restent séparées et ne sont pas reprises dans ce nouveau compte.

Le choix est explicite dans `interface/service-config.json` : `management.mode` vaut `local`. Les identifiants sont vérifiés localement avec une empreinte PBKDF2 SHA-256, un sel aléatoire et 600 000 itérations. Le mot de passe n’est pas conservé en clair et n’est envoyé à aucun service. Une session dure au maximum huit heures, expire après trente minutes d’inactivité et peut être fermée avec **Se déconnecter**. Effacer les données du navigateur supprime le compte et ses contenus locaux. Cet accès n’accorde aucun droit sur GitHub et ne constitue pas une autorisation de publication sur le site public.

## Publication partagée ultérieure

GitHub Pages héberge les fichiers statiques du site. Une connexion utilisable par les quatre administrateurs depuis plusieurs ordinateurs et une publication visible par tous nécessitent un service partagé associé au dépôt. Aucun service de ce type n’est actuellement connecté. Firebase et Supabase ne sont pas retenus, conformément au choix du propriétaire.

Le client de service et les conditions d’activation restent disponibles dans `administration/`. Le passage à ce fonctionnement exige de déployer et vérifier le service, puis de renseigner `authentication.apiBase` et de sélectionner `management.mode: production`. Les personnes initialement prévues sont Katiri Abdelah, Rbina Abdelah, Nachchat Mahmoud et Ilham Boudil ; aucun compte partagé n’a été créé pour elles.

## Publier un contenu

1. Ouvrir **Espace de gestion** et créer son accès local lors de la première visite, puis se connecter.
2. Choisir **Vidéo**, **Photos** ou **Communiqué de presse**. Chaque support possède son formulaire et sa saisie indépendante pendant le passage entre les trois choix.
3. Renseigner les champs propres au support, la page de publication et la rubrique, puis sélectionner les fichiers.
4. Vérifier l’aperçu, puis cliquer sur **Valider et publier** pour retrouver le contenu dans l’accueil de ce navigateur.

Les mots-clés nécessaires à l’indexation sont renseignés à partir de la rubrique. Les informations facultatives sont regroupées. Pour les vidéos, la langue parlée est distincte de la langue de la fiche. Un bref résumé français est demandé pour présenter une vidéo en arabe sur la page française.

Le formulaire **Vidéo** demande son titre, sa date de diffusion, le fichier ou le lien, la miniature et la langue parlée ; le résumé, les crédits et les sous-titres sont adaptés à la langue choisie. Le formulaire **Photos** propose le titre de l’album, la date des prises de vue, les photographies, leur couverture et leurs légendes ; le lieu et le crédit photographique sont facultatifs. Le formulaire **Communiqué de presse** propose le titre, la date du communiqué et un choix entre PDF, texte intégral ou texte et PDF ; le chapeau et le service émetteur sont facultatifs. Seul le contenu du format sélectionné est joint à la publication.

Après connexion du service, celui-ci devra enregistrer les fichiers et la fiche ensemble dans `publications/` par un seul commit. GitHub Actions vérifie et publie le catalogue. Le formulaire attend la présence effective du contenu dans le catalogue public avant d’annoncer sa mise en ligne. Une nouvelle tentative conserve le même identifiant de requête pour éviter les doublons côté serveur.

## Miniatures et sous-titres

Une miniature est extraite automatiquement de la vidéo importée et s’affiche dès son chargement, avant publication. Le volet **Choisir une autre image dans la vidéo** permet de déplacer le curseur du lecteur puis de cliquer sur **Utiliser cette image comme miniature**. Une image personnalisée peut aussi être importée. Un lien YouTube fournit sa miniature. Pour un album, l’administrateur choisit la photo de couverture indépendamment de l’ordre des photos.

Pour une vidéo importée, les sous-titres WebVTT peuvent être joints et vérifiés dans l’aperçu. Pour YouTube, ils doivent être publiés sur la vidéo dans YouTube Studio. La mention de sous-titres français ou arabes apparaît seulement lorsque l’administrateur a déclaré leur disponibilité et confirmé leur validation.

La dernière vidéo classique horizontale de la chaîne officielle `@Matnuhpv` est actualisée par GitHub Actions aux minutes 13 et 43 de chaque heure. La sélection utilise l’onglet Vidéos, exclut les Shorts et les directs, puis contrôle les dimensions du fichier. Le lecteur respecte les proportions de la vidéo, sans l’étirer ni lui imposer des bandes latérales. Si la vérification échoue, la dernière vidéo horizontale vérifiée est conservée. La page française reprend la traduction du titre YouTube ; la page arabe conserve son titre d’origine. Les titres traduits et résumés français validés sont associés à l’identifiant exact de la vidéo dans `site/video-localizations.json`. La page française utilise `site/latest-video-fr.json`. Si une nouvelle vidéo arabe n’a pas encore de titre français validé, cette page conserve la dernière vidéo traduite ; elle ne réaffiche jamais le titre arabe. La page arabe suit le dernier titre d’origine. L’audio d’origine est conservé ; le site ne traduit pas automatiquement les propos.

## Formats et limites

- Photos : JPG, PNG ou WebP, 30 photos maximum et 12 Mio par photo.
- Vidéo : MP4 ou WebM jusqu’à 25 Mio, ou lien HTTPS.
- Communiqué : PDF jusqu’à 20 Mio, texte ou les deux.
- Sous-titres : WebVTT jusqu’à 1 Mio.
- Publication complète : 100 Mio de fichiers maximum.

Les fichiers sont validés avant l’enregistrement. Les contenus ajoutés actuellement restent dans le navigateur ; des publications de production devront également être contrôlées par le générateur du catalogue avant leur diffusion publique.

## Source et vérifications

Les composants éditables se trouvent dans `interface/`. `scripts/build-interface.mjs` les assemble avec le runtime React conservé dans `site/assets/app.js`. `scripts/build-github-pages.mjs` génère `_site/` et valide les dossiers de `publications/`. L’accès local et ses contenus fonctionnent entièrement dans le navigateur, sans Firebase ni Supabase.

Avec Node.js 22.13 ou ultérieur et Python 3 :

```sh
npm test
npm run build
```

Le workflow `.github/workflows/pages.yml` exécute ces contrôles avant chaque publication GitHub Pages. Les tests couvrent notamment l’isolation des langues, les fichiers, l’accès GitHub, l’enregistrement des trois supports, les publications simultanées, la reprise après échec et les miniatures.
