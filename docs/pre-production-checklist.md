# Checklist avant mise en production — Takwria TN

Ce document liste les points **volontairement reportés** pendant le développement
du sous-projet *Fondations & Authentification*. Ce ne sont pas des oublis : ce
sont des décisions prises en connaissance de cause pour un projet en phase de
développement local, sans utilisateurs réels ni déploiement.

**Chacun de ces points doit être traité avant la première mise en ligne.**

## 1. Envoi réel des e-mails de réinitialisation — BLOQUANT

**État actuel :** aucun fournisseur d'e-mail n'est configuré. En développement,
le lien de réinitialisation est affiché dans la console du serveur
(`src/lib/mailer.ts`).

**Protection déjà en place :** en production, le lien n'est **jamais** journalisé
— la fonction refuse de l'écrire et signale l'absence de configuration à la
place. Un lien de réinitialisation dans des logs équivaut à une prise de contrôle
de compte pour quiconque peut les lire.

**À faire :** choisir un fournisseur (Resend, SendGrid, Amazon SES…), puis
implémenter l'envoi réel dans `deliverPasswordResetLink`. Sans cela, la
réinitialisation de mot de passe **ne fonctionne pas en production**.

## 2. `NEXTAUTH_SECRET` — protection active

**État actuel :** l'application **refuse de démarrer en production** si
`NEXTAUTH_SECRET` est absent, vide, égal à la valeur d'exemple
`change-me-in-dev`, ou fait **moins de 32 caractères** (`src/lib/env.ts`).

**À faire :** générer un vrai secret avant le déploiement :

```bash
openssl rand -base64 32
```

Un secret prévisible permet à quiconque a lu ce dépôt de forger un jeton de
session pour n'importe quel compte.

## 3. Énumération des comptes par mesure du temps de réponse

**État actuel : le canal temporel de connexion est corrigé, un canal distinct
reste ouvert volontairement.**

`authorizeCredentials` (`src/lib/auth.ts`) compare désormais systématiquement
le mot de passe fourni à un hash bcrypt factice (`DUMMY_HASH`, calculé une
fois au chargement du module) lorsque l'adresse n'existe pas, avant de
retourner `null`. Le coût CPU est donc payé sur les deux chemins et le temps
de réponse ne révèle plus l'existence d'un compte via `/api/auth/*`.

**Ce qui reste un choix assumé, pas un oubli :** la route d'inscription
révèle toujours volontairement l'existence d'un compte
(`409 « Cet e-mail est déjà utilisé »`) — ce n'est pas un canal temporel mais
un signal explicite dans la réponse, et c'est un choix d'ergonomie distinct,
non traité par ce correctif. Quiconque veut vérifier si une adresse est
inscrite peut donc toujours le faire via `/api/inscription`.

## 4. Limitation de débit (rate limiting) — implémentée

**État actuel :** `src/lib/rateLimit.ts` fournit un limiteur **en mémoire,
mono-processus** (`checkRateLimit`), appliqué à :

- `/api/inscription` — 5 tentatives / 15 min par IP, réponse `429` avec
  `Retry-After`.
- `/api/reinitialiser-mot-de-passe` — 10 tentatives / 15 min par IP, réponse
  `429` avec `Retry-After`.
- `/api/mot-de-passe-oublie` — 3 tentatives / heure par adresse e-mail et 20 /
  heure par IP, mais **sans réponse `429`** : au-delà de la limite, la route
  saute silencieusement la création du jeton et renvoie le même `200`
  générique, pour ne pas ouvrir un nouveau canal d'énumération plus rapide que
  l'existant (voir point 3).
- `authorizeCredentials` (connexion) — 5 tentatives / 15 min par
  couple e-mail + IP.

**Limite connue et documentée dans le code :** ce limiteur ne coordonne
**rien entre plusieurs instances/processus**. Il convient au déploiement
actuel (mono-instance). Un déploiement horizontal futur nécessiterait un
stockage partagé (Redis, ou un compteur en base).

## 5. Sessions JWT et changement de mot de passe — invalidation implémentée (partiellement)

**État actuel :** le modèle `User` porte désormais un champ `sessionVersion`
(migration `add_session_version`). Une réinitialisation de mot de passe
incrémente ce compteur ; le callback `jwt` de NextAuth (`src/lib/auth.ts`) le
recompare à chaque lecture du token et rejette la session (lève une erreur,
donc NextAuth la traite comme déconnectée) si la valeur ne correspond plus.

Ceci couvre effectivement `getServerSession`, `useSession`, et l'endpoint
`/api/auth/session` — donc les vérifications de page comme celles de
`/profil` et `/tableau-de-bord`, qui appellent `getServerSession` à chaque
chargement.

**Trou documenté et volontaire :** `next-auth/middleware` (`withAuth`, utilisé
dans `src/middleware.ts`) lit le cookie brut via `getToken()`, qui **décode le
JWT sans invoquer le callback `jwt`**. Un token juste révoqué peut donc encore
franchir la porte du middleware jusqu'à son expiration naturelle. Ce n'est pas
une faille silencieuse : c'est la vérification `getServerSession` au niveau
des pages elles-mêmes qui ferme réellement l'accès pour un utilisateur ayant
réinitialisé son mot de passe. Fermer aussi ce trou au niveau du middleware
nécessiterait un appel base de données depuis le Edge middleware, ce qui
entre en conflit avec le moteur de requêtes Prisma (Node uniquement) — non
traité dans ce correctif.

---

## Points déjà traités (pour mémoire)

- **Jetons de réinitialisation hachés** (SHA-256) en base — un instantané de la
  base ne donne plus de liens de réinitialisation exploitables.
- **Consommation atomique** du jeton, dans une transaction avec la mise à jour du
  mot de passe : pas de course, pas de jeton brûlé sans changement effectif.
- **Invalidation des autres jetons** en attente après une réinitialisation réussie.
- **Normalisation des adresses e-mail** (minuscules, espaces retirés) à
  l'inscription, à la connexion et à la réinitialisation.
- **Redirection ouverte fermée** sur `callbackUrl` : seules les cibles de même
  origine sont acceptées.
- **Mots de passe hachés** avec bcrypt, jamais journalisés ni renvoyés.
