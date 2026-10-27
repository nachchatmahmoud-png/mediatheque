# Médiathèque — GitHub Pages

Le site public et son espace de gestion sont hébergés dans ce dépôt et publiés sur GitHub Pages.

- Français : https://nachchatmahmoud-png.github.io/mediatheque/fr/
- العربية : https://nachchatmahmoud-png.github.io/mediatheque/ar/
- Gestion : https://nachchatmahmoud-png.github.io/mediatheque/fr/?view=manage

Les pages française et arabe disposent de leurs propres textes, résultats et événements. L’interface arabe se lit de droite à gauche. L’espace de gestion commun est en français et reste sur la même adresse GitHub Pages.

## Accès partagé à l’espace de gestion

La gestion utilise des comptes conservés côté serveur. Après l’activation initiale du compte, le même identifiant et le même mot de passe fonctionnent depuis plusieurs navigateurs et ordinateurs. Le portail public reste hébergé sur GitHub Pages. Les publications et leurs fichiers sont conservés dans une base commune et deviennent visibles sur l’accueil après validation, sans installation à effectuer sur chaque ordinateur.

Le propriétaire ouvre son lien personnel à usage unique, saisit son identifiant et son mot de passe habituels, puis clique simplement sur **Se connecter**. Aucun nouveau mot de passe n’est demandé. Si l’ancien compte est présent dans le navigateur, les identifiants sont vérifiés localement avant le transfert de son vérificateur ; celui-ci est ensuite mis à niveau à la connexion. Depuis un autre navigateur, le lien personnel autorise la conservation des identifiants saisis, y compris un ancien identifiant avec des espaces et un mot de passe antérieur à la règle des quinze caractères. Les invitations des autres administrateurs et les nouveaux mots de passe restent soumis à cette règle. Après cette première connexion, le même accès fonctionne à l’adresse de gestion habituelle depuis les autres navigateurs, sans lien personnel.

Le propriétaire peut créer les liens individuels de Katiri Abdelah, Rbina Abdelah et Ilham Boudil dans **Gérer les accès**. Chaque personne choisit elle-même son mot de passe. Les liens sont valables sept jours et utilisables une fois ; seuls leurs condensats sont stockés côté serveur. Les autres visiteurs ne peuvent pas créer de compte administrateur.

Les mots de passe ne figurent ni en clair ni sous forme de vérificateur dans le dépôt. Ils sont protégés côté serveur par scrypt ; les anciens vérificateurs PBKDF2 ne sont acceptés que dans le transfert autorisé du premier compte, puis remplacés à la première connexion. Les sessions ont une durée maximale de huit heures et expirent après trente minutes d’inactivité. Chaque navigateur ouvre sa propre session et la déconnexion ne ferme que cette session.

Le bouton œil affiche ou masque chaque champ de mot de passe. Les champs sont masqués par défaut et reviennent à cet état lors du changement de formulaire ou de l’envoi.

Les anciens contenus locaux restent conservés dans leur navigateur. Après connexion, le volet **Contenus enregistrés sur cet appareil** permet de les publier dans la médiathèque commune. Aucune publication locale n’est rendue publique automatiquement.

Le choix est explicite dans `interface/service-config.json` : `management.mode` vaut `production` et `authentication.shared` vaut `true`. Le code du service partagé et son schéma se trouvent dans `administration/shared/`. Il utilise un hébergement géré, une base D1 et un stockage R2. Firebase, Supabase et Railway ne sont pas utilisés pour ce service.

## Publier un contenu

1. Ouvrir **Espace de gestion**. La publication est actuellement ouverte, sans compte ni connexion.
2. Choisir **Vidéo**, **Photos** ou **Communiqué de presse**. Chaque support possède son formulaire et sa saisie indépendante pendant le passage entre les trois choix.
3. Renseigner les champs propres au support, les pages de publication et la rubrique, puis sélectionner les fichiers. Pour chaque support, cocher **Français**, **العربية** ou les deux. La vidéo et sa miniature, ou les photos et leur couverture, ne sont transférées qu’une seule fois. Pour un communiqué, deux boutons permettent de choisir un PDF français et un PDF arabe ; un seul PDF suffit et sera proposé sur les deux pages si le second n’est pas fourni.
4. Vérifier l’aperçu, puis cliquer sur **Valider et publier** pour retrouver le contenu dans l’accueil, depuis tous les navigateurs.

Les mots-clés nécessaires à l’indexation sont renseignés à partir de la rubrique. Les informations facultatives sont regroupées. Pour les vidéos, la langue parlée est distincte des pages de publication. Le titre arabe d’origine et sa traduction française sont saisis dans des champs séparés ; chaque page cochée doit avoir son titre. Pour les publications ajoutées dans l’espace de gestion, la traduction française est renseignée et vérifiée par l’administrateur. Les albums et les communiqués demandent aussi un titre par page cochée, ainsi que des légendes ou un texte propres à chaque langue. Les résumés et crédits restent facultatifs et propres à chaque langue. Les titres arabes sont refusés dans les champs français. Une page décochée conserve son brouillon dans le formulaire et n’est pas publiée.

Le formulaire **Vidéo** demande les pages de publication et leurs titres, sa date de diffusion, le fichier ou le lien, la miniature et la langue parlée. L’aperçu permet de vérifier chaque version avant une seule validation. Les deux fiches linguistiques partagent les mêmes fichiers et l’audio d’origine. Le formulaire **Photos** propose le titre de l’album, la date des prises de vue, les photographies, leur couverture et leurs légendes ; le lieu et le crédit photographique sont facultatifs. Le formulaire **Communiqué de presse** propose le titre, la date du communiqué et un choix entre PDF, texte intégral ou texte et PDF ; le chapeau et le service émetteur sont facultatifs. Seul le contenu du format sélectionné est joint à la publication.

Le service vérifie la fiche et les fichiers, puis enregistre la publication dans la base commune. Le formulaire attend sa présence effective dans le catalogue public avant d’annoncer sa mise en ligne. Une nouvelle tentative conserve le même identifiant de requête pour éviter les doublons. Le dépôt contient le code du portail et du service ; les comptes et les fichiers transférés ne sont pas copiés dans le dépôt public.

## Miniatures et sous-titres

Une miniature est extraite automatiquement de la vidéo importée et s’affiche dès son chargement, avant publication. Le volet **Choisir une autre image dans la vidéo** permet de déplacer le curseur du lecteur puis de cliquer sur **Utiliser cette image comme miniature**. Une image personnalisée peut aussi être importée. Un lien YouTube fournit sa miniature. Pour un album, l’administrateur choisit la photo de couverture indépendamment de l’ordre des photos.

Pour une vidéo importée, les sous-titres WebVTT peuvent être joints et vérifiés dans l’aperçu. Pour YouTube, ils doivent être publiés sur la vidéo dans YouTube Studio. La mention de sous-titres français ou arabes apparaît seulement lorsque l’administrateur a déclaré leur disponibilité et confirmé leur validation.

La dernière vidéo classique horizontale de la chaîne officielle `@Matnuhpv` est actualisée par GitHub Actions toutes les quinze minutes (aux minutes 7, 22, 37 et 52 de chaque heure). La sélection utilise l’onglet Vidéos, exclut les Shorts et les directs, puis contrôle les dimensions du fichier. Le lecteur respecte les proportions de la vidéo, sans l’étirer ni lui imposer des bandes latérales. Si la vérification échoue, la dernière vidéo horizontale vérifiée est conservée. La page française reprend la traduction du titre YouTube ; la page arabe conserve son titre d’origine. Les titres traduits et résumés français validés sont associés à l’identifiant exact de la vidéo dans `site/video-localizations.json`. La page française utilise `site/latest-video-fr.json`. Si le titre d’une nouvelle vidéo arabe n’a pas encore de traduction validée, le script traduit automatiquement ce titre via l’API GET publique MyMemory, sans compte ni clé. Seul le titre YouTube public est transmis, jamais les contenus de gestion. La traduction est mise en cache pour cet identifiant et ce titre d’origine, et signalée comme automatique dans l’accueil. Une traduction éditoriale validée reste prioritaire. Si YouTube ou le service de traduction est indisponible, la dernière version vérifiée est conservée, sans afficher de titre arabe dans la page française. La page arabe suit le dernier titre d’origine. L’audio d’origine est conservé ; le site ne traduit pas automatiquement les propos.

## Formats et limites

- Photos : JPG, PNG ou WebP, 30 photos maximum et 12 Mio par photo.
- Vidéo : MP4 ou WebM jusqu’à 25 Mio, ou lien HTTPS.
- Communiqué : PDF jusqu’à 20 Mio, texte ou les deux.
- Sous-titres : WebVTT jusqu’à 1 Mio.
- Publication complète : 100 Mio de fichiers maximum.

Les fichiers sont validés avant l’enregistrement. Les fichiers transférés sont privés tant que la publication n’est pas validée. Seules les pièces jointes référencées par une publication sont consultables publiquement.

## Source et vérifications

Les composants éditables se trouvent dans `interface/`. `scripts/build-interface.mjs` les assemble avec le runtime React conservé dans `site/assets/app.js`. `scripts/build-github-pages.mjs` génère `_site/` et valide les dossiers de `publications/`. Le service partagé réutilise les mêmes validateurs de supports et de catalogue que le portail.

Avec Node.js 22.13 ou ultérieur et Python 3 :

```sh
npm test
npm run build
```

Le workflow `.github/workflows/pages.yml` exécute ces contrôles avant chaque publication GitHub Pages. Les tests couvrent notamment l’isolation des langues, les fichiers, l’accès GitHub, l’enregistrement des trois supports, les publications simultanées, la reprise après échec et les miniatures.
