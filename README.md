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
```

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
