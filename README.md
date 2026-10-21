# Médiathèque — portail public

Vidéos, albums photo, communiqués et événements du Ministère de l’Aménagement du Territoire National, de l’Urbanisme, de l’Habitat et de la Politique de la Ville.

Le portail public est hébergé sur GitHub Pages : https://nachchatmahmoud-png.github.io/mediatheque/

## Accès et publication

**Espace de gestion** ouvre le service d’administration. L’identifiant et le mot de passe sont contrôlés par ce serveur. Les visiteurs ne peuvent ni transférer un fichier ni publier. Quatre comptes nominatifs disposent de mots de passe initiaux distincts. Le propriétaire consulte ces accès une seule fois depuis son espace protégé. Chaque utilisateur choisit son mot de passe personnel à la première connexion ; le propriétaire peut réinitialiser les autres comptes. Aucun mot de passe n’est conservé dans ce dépôt ou dans le navigateur.

Après connexion :

1. Choisir Vidéothèque, Photothèque ou Espace médias.
2. Renseigner le titre, la date, la rubrique et le support : vidéo ou lien HTTPS, photos, PDF ou texte du communiqué.
3. Vérifier l’aperçu si nécessaire, puis cliquer sur **✓ Valider et publier**.

Description, crédits, langue et légendes sont facultatifs. La langue est proposée selon le titre. Les photos peuvent être réordonnées ; la première sert de couverture.

Les fichiers sont transférés au serveur et restent protégés avant leur publication. Une confirmation n’apparaît qu’après l’enregistrement de l’événement et du support. Une nouvelle tentative après une interruption conserve l’identifiant de publication pour éviter un doublon. La liste des publications permet de les retrouver et de les consulter.

## Raccordement du catalogue public

`interface/service-config.json` définit l’origine du service et l’activation de son flux public. `publicFeedEnabled` reste désactivé tant que le service conserve son accès propriétaire uniquement. Le portail GitHub continue alors à afficher son catalogue statique existant. Après autorisation de consultation publique du service, activer ce réglage : l’accueil et la recherche liront les publications directement, sans transfert ZIP ni nouveau déploiement pour chaque contenu.

Les sessions et les écritures restent sur l’origine de l’administration. L’accueil public ne transmet aucune session au service et ne lit que le catalogue et les fichiers publiés. La mise en ligne d’un contenu suppose qu’il est validé pour diffusion publique.

## Consultation

La recherche depuis l’accueil porte sur les titres, rubriques, textes, légendes et mots-clés, en français et en arabe. **Affiner** regroupe les filtres par rubrique, année et langue. **Partager la recherche** copie une adresse qui conserve les critères et le tri. Les PDF et vidéos ne sont pas transcrits automatiquement.

La vidéo à la une provient du flux de la chaîne officielle https://www.youtube.com/@Matnuhpv, vérifié par GitHub Actions aux minutes 13 et 43 de chaque heure. La dernière vidéo connue reste disponible si le flux ne répond pas.

## Limites des fichiers

- Photos : JPG, PNG ou WebP ; 30 fichiers maximum, 12 Mio par fichier.
- Vidéo : MP4 ou WebM jusqu’à 25 Mio, ou adresse HTTPS.
- Communiqué : PDF jusqu’à 20 Mio, texte ou les deux.
- Publication : 100 Mio de fichiers au total.

## Source et validation

Les composants éditables sont dans `interface/`. `scripts/build-interface.mjs` les assemble avec le runtime et les lecteurs du socle `site/assets/app.js`. `scripts/build-github-pages.mjs` génère `_site`. Le serveur d’authentification et de stockage est un projet distinct ; aucun secret n’est inclus dans ce dépôt public.

Node.js 22.13 ou ultérieur et Python 3 : `npm test`, puis `npm run build`. Le workflow GitHub Actions exécute ces contrôles avant la publication GitHub Pages. Les anciennes fiches sous `publications/` restent prises en charge par le générateur statique. Elles restent publiques, y compris dans l’historique du dépôt.
