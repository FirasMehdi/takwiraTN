# Guide de déploiement — Takwria TN

Stack retenue : **Vercel** (hébergement Next.js) + **Postgres managé**
(Neon, recommandé — s'intègre nativement à Vercel) + **Resend** (e-mails) +
**GitHub** (dépôt + CI). Tout a un palier gratuit suffisant pour démarrer.

Suivez les étapes dans l'ordre — chacune dépend de la précédente.

## Étape 1 — Créer le dépôt GitHub

1. Sur [github.com/new](https://github.com/new), créez un dépôt (public ou
   privé, au choix — privé si vous ne voulez pas que le code soit visible).
   **Ne cochez aucune case d'initialisation** (pas de README, pas de
   `.gitignore`, pas de licence) — le dépôt local en a déjà.
2. En local, renommez la branche principale en `main` si ce n'est pas déjà
   fait (convention actuelle de GitHub, et c'est le nom que le workflow CI de
   ce dépôt attend) :

   ```bash
   git branch -m master main
   ```

3. Connectez le dépôt distant et poussez :

   ```bash
   git remote add origin https://github.com/<votre-compte>/<votre-depot>.git
   git push -u origin main
   ```

   (GitHub vous demandera de vous authentifier au premier push — via un
   navigateur ou un jeton d'accès personnel, selon comment `git` est
   configuré sur votre machine.)

4. Vérifiez sur GitHub que l'onglet **Actions** montre le workflow CI en
   cours d'exécution (il a été ajouté à ce dépôt : `.github/workflows/ci.yml`
   — tests, lint et build sur chaque push et chaque pull request).

## Étape 2 — Base de données Postgres (Neon)

1. Créez un compte sur [neon.tech](https://neon.tech) (le palier gratuit
   suffit largement pour démarrer).
2. Créez un projet. Neon vous donne immédiatement une chaîne de connexion
   `postgresql://...` — copiez-la, vous en aurez besoin à l'étape 4.
3. **Recommandé, pour plus tard :** Neon sait créer une *branche* de base de
   données par déploiement de prévisualisation Vercel (une copie légère et
   isolée de la base pour chaque pull request). Ce n'est pas nécessaire pour
   le premier déploiement, mais c'est la bonne pratique une fois que vous
   travaillez à plusieurs ou avec des pull requests régulières — voir
   [l'intégration Vercel de Neon](https://neon.tech/docs/guides/vercel).

## Étape 3 — E-mail (Resend)

1. Créez un compte sur [resend.com](https://resend.com) (gratuit jusqu'à
   3 000 e-mails/mois).
2. Dans le tableau de bord, générez une clé API (**API Keys** → **Create API
   Key**). Copiez-la — vous en aurez besoin à l'étape 4, et Resend ne la
   réaffichera plus ensuite.
3. Pour commencer, aucune autre configuration n'est nécessaire : les e-mails
   partiront du domaine de test `onboarding@resend.dev`, qui fonctionne
   immédiatement. Pour un domaine personnalisé (`no-reply@votredomaine.tn`
   par exemple), vérifiez d'abord ce domaine dans **Domains** sur Resend
   (ajout d'enregistrements DNS), puis définissez `EMAIL_FROM` en conséquence
   à l'étape 4 — à faire plus tard, pas bloquant maintenant.

## Étape 4 — Déployer sur Vercel

1. Créez un compte sur [vercel.com](https://vercel.com) — le plus simple est
   de vous inscrire directement avec votre compte GitHub (**Continue with
   GitHub**), ça simplifie la connexion du dépôt à l'étape suivante.
2. **Add New** → **Project**, puis importez le dépôt GitHub créé à l'étape 1.
   Vercel détecte automatiquement qu'il s'agit d'un projet Next.js — aucun
   réglage de build à changer.
3. Avant de cliquer sur **Deploy**, ouvrez la section **Environment
   Variables** et ajoutez :

   | Variable | Valeur |
   |---|---|
   | `DATABASE_URL` | la chaîne de connexion Neon de l'étape 2 |
   | `NEXTAUTH_SECRET` | générez-en un : `openssl rand -base64 32` (jamais la valeur d'exemple du dépôt) |
   | `NEXTAUTH_URL` | l'URL que Vercel va attribuer, ex. `https://votre-projet.vercel.app` — vous pouvez la mettre à jour après le premier déploiement une fois l'URL connue |
   | `RESEND_API_KEY` | la clé de l'étape 3 |
   | `TZ` | `Africa/Tunis` |

   `EMAIL_FROM` est optionnel (voir étape 3) — si absent, Resend utilise le
   domaine de test par défaut.

4. Cliquez sur **Deploy**. Le premier déploiement échouera probablement à
   l'étape de build si la base de données n'a pas encore son schéma — c'est
   normal, l'étape suivante corrige ça.

## Étape 5 — Appliquer les migrations sur la base de production

Depuis votre machine locale, en pointant temporairement vers la base Neon :

```bash
DATABASE_URL="<votre-chaine-de-connexion-neon>" npm run db:migrate:deploy
```

(`db:migrate:deploy` exécute `prisma migrate deploy` — applique les
migrations existantes sans en générer de nouvelles, la commande sûre à lancer
contre une base réelle. Ne jamais utiliser `db:migrate`/`prisma migrate dev`
contre la production — elle peut demander à réinitialiser la base en cas de
divergence.)

Optionnel — insérer les terrains de démonstration sur la base de prod :

```bash
DATABASE_URL="<votre-chaine-de-connexion-neon>" npm run db:seed
```

(Ignorez cette étape si vous préférez démarrer avec une base vide et ajouter
de vrais terrains plus tard — la gestion des terrains par un propriétaire
n'est pas encore construite, donc pour l'instant seul `db:seed` peuple la
base.)

Retournez sur Vercel et redéployez (**Deployments** → les trois points sur le
dernier déploiement échoué → **Redeploy**) — le build devrait maintenant
réussir.

## Étape 6 — Vérification post-déploiement

Une fois le déploiement vert, testez manuellement sur l'URL Vercel :

- [ ] `/` charge et affiche la page d'accueil
- [ ] `/terrains` affiche les terrains (si vous avez seedé à l'étape 5)
- [ ] Créer un compte sur `/inscription` fonctionne
- [ ] Se connecter sur `/connexion` fonctionne
- [ ] Réserver un créneau depuis `/terrains/<id>` fonctionne, et apparaît
      sur `/tableau-de-bord`
- [ ] `/mot-de-passe-oublie` avec un compte réel envoie effectivement un
      e-mail (vérifiez la boîte de réception — pensez au dossier spam pour
      un premier envoi depuis `onboarding@resend.dev`)
- [ ] Les en-têtes de sécurité sont présents : `curl -sI https://votre-url.vercel.app/terrains | grep -i x-frame`
      doit afficher `X-Frame-Options: DENY`

Si `NEXTAUTH_URL` ne correspondait pas encore à l'URL réelle à l'étape 4,
mettez-la à jour maintenant dans les variables d'environnement Vercel et
redéployez.

## Domaine personnalisé (plus tard, pas bloquant)

Quand vous aurez un nom de domaine : **Project Settings** → **Domains** sur
Vercel, ajoutez le domaine, suivez les instructions DNS affichées (un
enregistrement `CNAME` ou `A` chez votre registrar). Pensez à mettre à jour
`NEXTAUTH_URL` vers ce domaine une fois actif.

---

## Travailler dessus « professionnellement » — quelques habitudes qui comptent

**Ne jamais pousser directement sur `main`.** Une fois le dépôt sur GitHub,
travaillez sur une branche (`git checkout -b ma-fonctionnalite`), ouvrez une
*pull request*, laissez la CI tourner (elle bloque déjà tests/lint/build),
et mergez seulement quand c'est vert. Vercel crée automatiquement une URL de
prévisualisation unique pour chaque pull request — vous voyez le résultat
avant de merger, sans toucher à la production.

**Les secrets ne vivent jamais dans le dépôt.** `NEXTAUTH_SECRET`,
`DATABASE_URL`, `RESEND_API_KEY` : uniquement dans les variables
d'environnement Vercel (et votre `.env` local, qui est déjà dans
`.gitignore`). Si l'un d'eux fuite un jour (commit accidentel, capture
d'écran…), régénérez-le immédiatement — un `NEXTAUTH_SECRET` compromis
permet de forger une session pour n'importe quel compte.

**Les migrations de base de données sont irréversibles en pratique.** Sur la
production, `prisma migrate deploy` uniquement (jamais `migrate dev`, jamais
`migrate reset`). Neon garde un historique de sauvegardes automatiques
(*point-in-time recovery*), mais une migration qui supprime une colonne avec
des données dedans reste destructrice — testez d'abord contre une branche
Neon ou une base de test.

**Surveillance minimale, sans sur-ingénierie pour un projet qui démarre :**
Vercel donne déjà des logs de requêtes et des métriques de base gratuitement
(**Observability** dans le tableau de bord du projet) — largement suffisant
pour commencer. Si le projet grossit, [Sentry](https://sentry.io) (palier
gratuit) pour le suivi d'erreurs applicatives est l'ajout naturel suivant —
pas nécessaire dès le premier déploiement.

**Limite connue à surveiller si le trafic grossit :** le limiteur de débit
(`src/lib/rateLimit.ts`) est en mémoire, mono-processus — il fonctionne
correctement sur Vercel tant que chaque route s'exécute dans une seule
instance de fonction à la fois, ce qui est le cas par défaut, mais il ne
coordonne rien entre plusieurs invocations concurrentes à fort trafic. Si
l'authentification/l'inscription reçoit un trafic significatif, la
prochaine étape est un compteur partagé (Redis, ex. Upstash — a un palier
gratuit et s'intègre bien à Vercel).
