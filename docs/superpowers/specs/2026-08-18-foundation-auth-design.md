# Design — Sub-projet 1 : Fondations & Authentification (Takwria TN)

Date : 2026-08-18
Statut : Approuvé pour planification

## Contexte

*Takwria TN* est une plateforme neuve (aucun code existant) décrite dans
`plan.md`. Le projet complet couvre trop de sous-systèmes indépendants
(auth, terrains, réservations, matchs, coéquipiers, espace propriétaire,
administration) pour un seul spec/plan. Ce document couvre uniquement le
**premier sous-projet : les fondations techniques et l'authentification**,
préalable indispensable à tous les autres.

Sous-projets suivants (hors périmètre de ce document, planifiés séparément
et dans cet ordre) :
2. Terrains (recherche, fiche détail, disponibilités)
3. Réservations (booking, anti-double-réservation, tableau de bord)
4. Matchs (création, participation)
5. Coéquipiers & Notifications
6. Espace propriétaire & Administration

## Objectif de ce sous-projet

Poser le socle technique de l'application et livrer un parcours complet
d'inscription / connexion / gestion de profil joueur, avec une coquille de
navigation mobile-first prête à accueillir les sous-projets suivants.

## Décisions techniques

| Sujet | Décision |
|---|---|
| Stack | Next.js (App Router) + TypeScript, full-stack dans un seul repo |
| ORM / DB | Prisma + PostgreSQL |
| DB locale | Docker Compose (Postgres) pour le développement ; hébergement choisi plus tard |
| Styles | Tailwind CSS, mobile-first |
| Authentification | Auth.js (NextAuth), provider Credentials (email + mot de passe) |
| Connexion | E-mail + mot de passe uniquement (pas de connexion par téléphone au MVP) |
| Rôles | `joueur` (par défaut), `proprietaire`, `administrateur`. « Organisateur » n'est pas un rôle : tout joueur connecté devient organisateur en créant un match (traité dans le sous-projet 4) |
| E-mails (reset password) | Loggés en console en dev (pas de vrai fournisseur pour l'instant) |
| Validation | zod, messages d'erreur en français |
| Tests | Vitest (logique + composants), TDD |
| Contrôle de version | git, commits au fil de l'implémentation |

## Modèle de données (ce sous-projet)

```
User
  id            String (cuid) PK
  email         String unique
  passwordHash  String
  role          Enum(joueur, proprietaire, administrateur) default joueur
  createdAt     DateTime

PlayerProfile
  userId        String FK -> User.id (unique)
  prenom        String
  ville         String
  poste         String?          // gardien, défenseur, milieu, attaquant...
  niveau        String?          // débutant, intermédiaire, avancé
  piedPreferé   String?          // gauche, droit, ambidextre
  telephone     String?
  photoUrl      String?
  bio           String?

PasswordResetToken
  id            String PK
  userId        String FK -> User.id
  token         String unique
  expiresAt     DateTime
  usedAt        DateTime?
```

## Pages & routes

| Route | Contenu |
|---|---|
| `/` | Page d'accueil : hero, CTA « Réserver un terrain » / « Rejoindre un match », nav mobile basse |
| `/inscription` | Formulaire : e-mail, mot de passe, prénom, ville → crée `User` + `PlayerProfile` |
| `/connexion` | E-mail + mot de passe |
| `/mot-de-passe-oublie` | Saisie e-mail → génère `PasswordResetToken`, log du lien en console |
| `/reinitialiser-mot-de-passe/[token]` | Nouveau mot de passe si token valide et non expiré |
| `/profil` | Voir / modifier son `PlayerProfile` (protégé, nécessite session) |
| `/tableau-de-bord` | Coquille vide « à venir », protégée par session |
| `/terrains`, `/matchs`, `/joueurs` | Pages stub « à venir » pour que la nav ne casse pas (contenu réel dans les sous-projets 2, 4, 5) |

Navigation mobile basse (§8 du plan) : Accueil, Terrains, Matchs, Joueurs,
Profil — visible sur toutes les pages, adaptée à l'état connecté/déconnecté
(Profil → lien vers `/connexion` si non connecté).

## Flux d'erreurs / règles

- Inscription : e-mail déjà utilisé → erreur inline « Cet e-mail est déjà
  utilisé ». Mot de passe : règles minimales (8 caractères) validées côté
  client (zod) et revalidées côté serveur.
- Connexion : identifiants invalides → message générique (ne pas révéler si
  l'e-mail existe).
- Mot de passe oublié : toujours répondre succès générique côté UI (ne pas
  révéler si l'e-mail existe), même logique appliquée au token.
- Token de reset expiré ou déjà utilisé → message d'erreur + lien pour
  redemander un reset.
- Mots de passe stockés hashés (bcrypt), jamais en clair (§7 du plan).
- Pages protégées (`/profil`, `/tableau-de-bord`) redirigent vers
  `/connexion` si pas de session.

## Tests

- Unitaires : hashing/validation mot de passe, génération/validation de
  token de reset, schémas zod (signup/login/profil).
- Intégration : route handlers d'inscription, connexion, reset password
  (succès + cas d'erreur) contre une base de test.
- Composants : formulaires (inscription, connexion, profil) — rendu,
  validation, affichage des erreurs.
- TDD : tests écrits avant l'implémentation pour chaque brique logique.

## Mise en place dev

- `docker-compose.yml` : service Postgres pour le développement local.
- `.env.example` : `DATABASE_URL`, secret NextAuth, etc.
- `README.md` : instructions d'installation et de lancement.
- Repo git initialisé, commits réguliers au fil de l'implémentation.

## Hors périmètre (rappel)

Recherche/affichage de terrains, réservations, matchs, coéquipiers,
notifications, espace propriétaire, administration, paiement, avis,
messagerie — tout cela est traité dans les sous-projets suivants.
