# Takwria TN

Trouve ton terrain. Forme ton équipe. Joue ton match.

Plateforme de réservation de terrains de sport en Tunisie : inscription et
connexion, recherche et consultation des terrains, réservation de créneaux
avec protection contre la double-réservation, annulation, tableau de bord
joueur.

## Prérequis

- Node.js 20+
- Docker (pour PostgreSQL en local)

## Installation

```bash
npm install
cp .env.example .env
cp .env.test.example .env.test
docker compose up -d
npm run db:migrate       # applique le schéma sur la base de dev
npm run db:migrate:test  # applique le schéma sur la base de test
npm run db:seed          # insère des terrains de démonstration
```

## Fuseau horaire

Le processus Node **doit** démarrer avec `TZ=Africa/Tunis` défini au niveau du
système d'exploitation (pas seulement dans `.env` : Node lit `TZ` au
démarrage, avant que dotenv ait pu le charger). La génération des créneaux
horaires (`src/lib/terrains/slots.ts`, `src/lib/terrains/queries.ts`) utilise
l'heure locale du process comme heure de Tunis ; sans ce réglage, sur un hôte
en UTC par défaut, les créneaux « déjà passés » seraient filtrés avec une
heure de décalage et la frontière entre deux jours pourrait basculer au
mauvais moment entre 00h00 et 01h00 (heure de Tunis).

## Développement

```bash
npm run dev     # démarre l'app sur http://localhost:3000
npm test        # lance la suite de tests (Vitest)
npm run lint    # vérifie le code (ESLint)
npm run build   # build de production
```

En développement, les liens de réinitialisation de mot de passe sont affichés
dans la console du serveur — aucune clé d'API n'est nécessaire en local. En
production, ils sont envoyés par e-mail via [Resend](https://resend.com) (voir
`RESEND_API_KEY` dans `.env.example`).

## Déploiement

Guide complet, pas à pas : **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**
(Vercel + base de données Postgres managée + Resend + CI GitHub Actions).

## Avant une mise en production

Ce projet est en phase de développement. Le point le plus critique déjà
traité : voir **[`docs/pre-production-checklist.md`](docs/pre-production-checklist.md)**
pour le détail complet et ce qui reste un choix assumé plutôt qu'un oubli.

À ne jamais oublier au déploiement :

- **Générez un vrai `NEXTAUTH_SECRET`** (`openssl rand -base64 32`).
  L'application refuse de démarrer en production avec la valeur d'exemple ou
  un secret de moins de 32 caractères.
- **Configurez `RESEND_API_KEY`.** Sans cela, la réinitialisation de mot de
  passe ne fonctionne pas en production : le lien n'est jamais journalisé
  hors développement, précisément pour ne pas exposer un accès aux comptes
  dans les logs.
