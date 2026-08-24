# Takwria TN

Trouve ton terrain. Forme ton équipe. Joue ton match.

Sous-projet actuel : **Fondations & Authentification** (voir
`docs/superpowers/specs/2026-08-18-foundation-auth-design.md`).

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

En développement, les liens de réinitialisation de mot de passe sont
affichés dans la console du serveur (pas d'envoi d'e-mail réel pour
l'instant).

## Avant une mise en production

Ce projet est en phase de développement local. Certains points de sécurité
ont été **volontairement reportés** et doivent être traités avant toute mise
en ligne : voir **[`docs/pre-production-checklist.md`](docs/pre-production-checklist.md)**.

Les deux plus importants :

- **Générez un vrai `NEXTAUTH_SECRET`** (`openssl rand -base64 32`).
  L'application refuse de démarrer en production avec la valeur d'exemple.
- **Configurez un fournisseur d'e-mail.** Sans cela, la réinitialisation de
  mot de passe ne fonctionne pas en production : le lien n'est jamais
  journalisé hors développement, précisément pour ne pas exposer un accès
  aux comptes dans les logs.
