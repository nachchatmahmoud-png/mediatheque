# Activation du service administrateur

Le site et le formulaire sont sur GitHub Pages. Le code du service sécurisé est disponible dans `administration/server/` et son point d’entrée Supabase dans `supabase/functions/mediatheque/`. Le service n’est pas encore déployé dans un projet Supabase connecté. Le formulaire reste désactivé tant que `authentication.apiBase` est vide : il ne collecte et ne transmet alors aucun mot de passe.

La connexion au compte Supabase, le choix du projet et l’autorisation de publication GitHub côté serveur restent nécessaires. Les profils demandés sont définis dans `accounts.mjs`. Le script de création génère un mot de passe initial individuel et impose son remplacement à la première connexion ; aucun compte réel n’est créé par la simple publication de ce dépôt.

## Contrat attendu par le client

Les chemins ci-dessous s’ajoutent à `authentication.apiBase` (qui peut inclure le chemin d’une fonction Edge). Les réponses sont en JSON avec `Cache-Control: no-store`. Autoriser uniquement l’origine `https://nachchatmahmoud-png.github.io` pour CORS, les méthodes requises et les en-têtes `Content-Type`, `Authorization`. Ne pas utiliser de redirection.

| Requête | Données | Réponse |
| --- | --- | --- |
| `POST /api/auth/login` | `{username,password}` | `{authenticated:true,sessionToken,expiresAt,displayName,role}` ; rôle `admin` ou `owner`, expiration ISO dans 8 heures au maximum |
| `GET /api/auth/session` | Session Bearer | `{authenticated:true}` uniquement si le compte et la session sont toujours valides |
| `POST /api/auth/logout` | Session Bearer, corps `{}` | Révoquer la session puis `{ok:true}` |
| `POST /api/auth/change-password` | Session Bearer, `{currentPassword,password,confirmPassword}` | Révoquer les anciennes sessions puis émettre une nouvelle session |
| `POST /api/uploads?name=…` | Session Bearer, fichier binaire | `{url:"admin-upload:<UUID>",name,size}` ; référence temporaire privée liée à ce compte |
| `POST /api/publications` | Session Bearer, fiche JSON du formulaire | `{id}` correspondant à l’identifiant final du catalogue GitHub Pages |

Répondre `401` pour des identifiants incorrects ou une session expirée, `403` pour un compte non habilité et `429` après trop de tentatives. Les autres erreurs peuvent fournir `{error:"Message destiné à l’administrateur"}` sans information sensible.

## Conditions avant activation

- Créer les quatre comptes demandés avec un fournisseur d’authentification éprouvé, des mots de passe individuels protégés côté serveur, une limitation des tentatives et la révocation des sessions. Aucun registre de mots de passe ou de leurs empreintes ne doit être accessible depuis le dépôt public.
- Vérifier l’habilitation du compte sur **chaque** transfert et publication. Les restrictions de l’interface ne sont pas un contrôle d’accès.
- Conserver l’autorisation GitHub exclusivement dans les secrets du serveur, limitée au dépôt `nachchatmahmoud-png/mediatheque`. Ne jamais la renvoyer au navigateur.
- Vérifier les signatures, tailles et formats des fichiers, les langues, les sous-titres et la fiche avec les règles de `app/lib/model.ts` et `github-pages/catalogue.ts`. Refuser les références temporaires appartenant à un autre compte.
- Écrire uniquement les dossiers `publications/` autorisés en un seul commit, sans écrasement forcé. Utiliser `requestId` pour garantir l’idempotence, y compris après une perte de connexion.
- Vérifier connexion valide/invalide, compte non habilité, expiration, déconnexion et publication réelle des trois supports avant de renseigner l’adresse de production.

Le navigateur attend ensuite que l’identifiant existe dans `catalogue.json` avant d’annoncer « publié ». Les tests du client et du serveur utilisent des services externes simulés ; les règles SQL de confidentialité, d’expiration, de révocation et de limitation des tentatives sont exécutées dans PostgreSQL avec PGlite. Ces tests ne prouvent pas qu’un projet Supabase ou des comptes réels ont été activés.


## Préparer et vérifier le déploiement

```sh
npm ci --prefix administration
npm run check --prefix administration
npm test --prefix administration
npm run admin:package
```

Le dernier script rassemble les modules et leurs validateurs communs dans un dossier généré, ignoré par Git, sans aucun secret. Le point d’entrée est `supabase/functions/mediatheque/index.ts`. Le workflow `administration.yml` exécute ces vérifications sans accès à des comptes réels.

Après connexion à un projet Supabase autorisé :

1. Appliquer `supabase/migrations/202610220001_mediatheque_admin.sql`. Les tables de gestion et le stockage temporaire sont privés ; les sessions ne stockent que l’empreinte du jeton, avec une durée maximale de huit heures et trente minutes d’inactivité.
2. Conserver `MEDIATHEQUE_GITHUB_TOKEN` dans les secrets Supabase. Son autorisation doit être limitée au dépôt de la médiathèque et à l’écriture de son contenu. Aucune clé n’est demandée dans le formulaire public.
3. Exécuter `administration/provision.mjs` dans un contexte privé avec le projet vérifié et sa clé serveur transmis par l’entrée standard sous la forme `{url,secret}`. **Ne pas l’exécuter dans GitHub Actions : sa sortie contient les mots de passe initiaux et doit être remise uniquement au propriétaire.** Une nouvelle exécution ne réinitialise pas les comptes dont le profil existe déjà.
4. Déployer la fonction `mediatheque`. Le contrôle JWT de la passerelle est remplacé, pour cette nouvelle fonction, par la vérification explicite de sessions opaques dans le gestionnaire. Seules la connexion, les requêtes CORS et la vérification de disponibilité sont publiques ; chaque transfert et publication requiert une session valide et un mot de passe personnel déjà défini.
5. Vérifier le droit de publication du serveur, la connexion réelle, le changement du mot de passe initial et la publication des trois supports. Les fichiers sont limités à 12 Mio pour une photo, 25 Mio pour une vidéo, 20 Mio pour un PDF et 1 Mio pour un WebVTT, comme le catalogue GitHub existant. Le dossier complet ne peut pas dépasser 100 Mio.
6. Renseigner ensuite seulement l’adresse HTTPS exacte de la fonction dans `authentication.apiBase`, puis publier le site GitHub Pages.

Les adresses `identifiant@mediatheque.invalid` sont des alias techniques internes de connexion. Elles ne servent pas à envoyer de courriel. Les utilisateurs saisissent uniquement leur identifiant dans le formulaire de la médiathèque. La récupération d’un accès perdu nécessite l’intervention de l’opérateur habilité ; aucun lien public de réinitialisation n’est exposé.
