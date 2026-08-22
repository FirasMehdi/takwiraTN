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
