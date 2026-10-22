# Activation du service administrateur

Le site et le formulaire sont sur GitHub Pages. Le service d’authentification n’est pas encore connecté. Le formulaire est désactivé tant que `authentication.apiBase` est vide : il ne collecte et ne transmet alors aucun mot de passe.

Supabase est la solution proposée pour héberger la vérification des comptes et le service de publication. La connexion au compte Supabase, le choix du projet et l’autorisation de publication GitHub côté serveur restent nécessaires. Aucun compte ni serveur opérationnel n’est fourni par ce dossier.

## Contrat attendu par le client

Les chemins ci-dessous s’ajoutent à `authentication.apiBase` (qui peut inclure le chemin d’une fonction Edge). Les réponses sont en JSON avec `Cache-Control: no-store`. Autoriser uniquement l’origine `https://nachchatmahmoud-png.github.io` pour CORS, les méthodes requises et les en-têtes `Content-Type`, `Authorization`. Ne pas utiliser de redirection.

| Requête | Données | Réponse |
| --- | --- | --- |
| `POST /api/auth/login` | `{username,password}` | `{authenticated:true,sessionToken,expiresAt,displayName,role}` ; rôle `admin` ou `owner`, expiration ISO dans 8 heures au maximum |
| `GET /api/auth/session` | Session Bearer | `{authenticated:true}` uniquement si le compte et la session sont toujours valides |
| `POST /api/auth/logout` | Session Bearer, corps `{}` | Révoquer la session puis `{ok:true}` |
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

Le navigateur attend ensuite que l’identifiant existe dans `catalogue.json` avant d’annoncer « publié ». Les tests du dépôt vérifient le contrat du client avec des réponses simulées ; ils ne prouvent pas qu’un service ou des comptes réels ont été activés.
