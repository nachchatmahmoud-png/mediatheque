# Médiathèque — version publique

Vidéos, albums photo, communiqués de presse et dossiers d’événements du Ministère de l’Aménagement du Territoire National, de l’Urbanisme, de l’Habitat et de la Politique de la Ville.

**Ce dépôt et tous les fichiers qui y sont ajoutés sont publics. Déposez uniquement des contenus validés pour diffusion publique.**

Le site ne devient accessible qu’après activation de GitHub Pages et réussite du déploiement. Le catalogue est initialement vide.

## Publier un événement

1. Dans le site, ouvrir **Espace de gestion**.
2. Choisir **Vidéothèque**, **Photothèque** ou **Espace médias**, puis sélectionner les fichiers à importer.
3. Saisir le titre, la date et les mots-clés. La rubrique est proposée selon les mots-clés choisis ; le choix manuel reste possible. Les descriptions, légendes et transcriptions sont facultatives, dans **Informations complémentaires**.
4. Télécharger le dossier ZIP, puis l’extraire sur l’ordinateur.
5. Ouvrir [publications](https://github.com/nachchatmahmoud-png/mediatheque/tree/main/publications), puis **Add file → Upload files**. Déposer le dossier extrait entier et valider **Commit changes**.
6. Attendre la réussite du workflow **Publication GitHub Pages** dans l’onglet Actions.

La publication utilise l’authentification GitHub et les droits d’écriture sur ce dépôt. Le formulaire prépare les fichiers localement ; il ne les envoie pas avant votre validation sur GitHub. Aucun identifiant ou mot de passe de l’application de travail n’est transféré dans cette version.

## Vidéo à la une

L’encadré de l’accueil affiche la dernière vidéo de la chaîne officielle https://www.youtube.com/@Matnuhpv. Le flux public est vérifié automatiquement aux minutes 13 et 43 de chaque heure. Un nouveau déploiement est lancé uniquement si la vidéo ou ses informations ont changé. Les horaires de lancement peuvent être décalés par GitHub Actions. La dernière vidéo connue est conservée si YouTube est temporairement indisponible.

## Corriger ou retirer un contenu

Chaque événement possède sa fiche `publications/nom-du-dossier/publication.json`. Modifier cette fiche pour corriger ses informations. Passer `status` de `published` à `draft` retire le dossier du site après le prochain déploiement.

**Un retrait du site ne rend pas les fichiers du dépôt privés. Ils restent consultables dans le dépôt public et son historique. N’y ajoutez jamais de donnée confidentielle.**

## Capacités et limites

- Album : jusqu’à 30 photographies JPG, PNG ou WebP, 12 Mio par fichier.
- Vidéo : MP4 ou WebM, 25 Mio par fichier pour le transfert depuis le navigateur GitHub, ou adresse HTTPS existante.
- Communiqué : PDF jusqu’à 20 Mio, texte saisi, ou les deux.
- Dossier préparé dans le navigateur : 100 Mio au total.
- Recherche : titres, mots-clés et sigles, présentation, légendes, transcriptions saisies et textes des communiqués. Les PDF et les vidéos ne sont pas transcrits automatiquement.
- Les données de comptes, les sessions et la base de l’application de travail ne sont pas incluses.

## Hébergement

Dans **Settings → Pages**, choisir **GitHub Actions**, puis lancer le workflow **Publication GitHub Pages** depuis Actions. Les modifications suivantes du dépôt reconstruisent automatiquement le site.

Le répertoire `site` contient l’interface compilée. Le script `scripts/build-github-pages.mjs` valide le catalogue et copie uniquement les supports publiés dans `_site`. Le code du serveur de l’application complète n’est pas inclus.

Vérification locale : Node.js 22, puis `npm run build`. Aucune installation de dépendances n’est requise.

Documentation officielle : https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
