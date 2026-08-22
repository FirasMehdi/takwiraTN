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
`NEXTAUTH_SECRET` est absent, vide, ou encore égal à la valeur d'exemple
`change-me-in-dev` (`src/lib/env.ts`).

**À faire :** générer un vrai secret avant le déploiement :

```bash
openssl rand -base64 32
```

Un secret prévisible permet à quiconque a lu ce dépôt de forger un jeton de
session pour n'importe quel compte.

## 3. Énumération des comptes par mesure du temps de réponse

**État actuel :** reporté volontairement.

`authorizeCredentials` (`src/lib/auth.ts`) et la route
`/api/mot-de-passe-oublie` répondent plus vite pour une adresse inconnue que
pour une adresse connue : le chemin « inconnu » saute la comparaison bcrypt ou
l'écriture en base. Un attaquant patient peut ainsi deviner quelles adresses
sont inscrites.

**Pourquoi c'est reporté :** la route d'inscription révèle déjà volontairement
l'existence d'un compte (`409 « Cet e-mail est déjà utilisé »`), ce qui est un
choix d'ergonomie standard. Corriger le canal temporel seul ne fermerait rien,
puisque l'énumération reste triviale via l'inscription.

**À faire, comme un seul chantier :** décider du comportement de l'inscription,
ajouter une limitation de débit (rate limiting) sur la connexion et sur la
demande de réinitialisation, et égaliser les temps de réponse (comparaison
bcrypt factice quand l'utilisateur n'existe pas).

## 4. Limitation de débit (rate limiting) — absente

**État actuel :** aucune limitation sur `/api/inscription`, `/api/auth/*`,
`/api/mot-de-passe-oublie` ni `/api/reinitialiser-mot-de-passe`.

**À faire :** limiter les tentatives par IP et par compte. Sans cela, rien
n'empêche le bourrage d'identifiants (credential stuffing) ni l'envoi massif de
demandes de réinitialisation.

## 5. Sessions JWT et changement de mot de passe

**État actuel :** les sessions utilisent la stratégie `jwt`. Une réinitialisation
de mot de passe **n'invalide pas** les sessions déjà ouvertes ailleurs — un JWT
émis avant reste valide jusqu'à son expiration.

**À faire :** si l'invalidation immédiate est nécessaire, passer aux sessions en
base de données, ou ajouter un champ de version de session dans le JWT, comparé à
une valeur stockée sur l'utilisateur.

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
