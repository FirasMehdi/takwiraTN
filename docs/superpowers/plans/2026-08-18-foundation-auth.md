# Foundation & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Takwria TN project scaffold and deliver a complete signup / login / password-reset / player-profile flow with a mobile-first navigation shell.

**Architecture:** Next.js (App Router, TypeScript) full-stack app, Prisma + PostgreSQL for data, Auth.js (NextAuth v4, Credentials provider, JWT sessions) for auth, Tailwind CSS for styling. All server logic lives in Next.js route handlers; client forms call those routes with `fetch` or NextAuth's `signIn`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma 5 + PostgreSQL, next-auth 4, zod, bcryptjs, Tailwind CSS 3, Vitest + Testing Library, Docker Compose (local Postgres).

**Spec:** `docs/superpowers/specs/2026-08-18-foundation-auth-design.md`

## Global Constraints

- Full-stack app lives in a single Next.js (App Router + TypeScript) repo — no separate frontend/backend services.
- Data layer: Prisma ORM against PostgreSQL. Local dev DB via Docker Compose; hosted DB decided later.
- Styling: Tailwind CSS, mobile-first.
- Auth: Auth.js/NextAuth v4, Credentials provider (email + password only — no phone login, no OTP).
- Roles: `joueur` (default), `proprietaire`, `administrateur`. "Organisateur" is not a stored role.
- Passwords: hashed with bcrypt, never stored or logged in plain text.
- Login and password-reset-request responses must never reveal whether an e-mail exists in the system.
- Password-reset e-mails are not actually sent yet — the reset link is logged to the console in dev.
- All user-facing copy (labels, errors, messages) is in French.
- TDD: for every unit of logic, write the failing test before the implementation.
- Commit after each task's tests pass.

---

## Task 1: Project Scaffold & Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.eslintrc.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `.env.test.example`
- Create: `docker-compose.yml`
- Create: `README.md`
- Create: `prisma/schema.prisma`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `vitest.config.ts`
- Create: `tests/setup/vitest.setup.ts`
- Test: `tests/setup/sanity.test.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `test`, `db:migrate`, `db:migrate:test`; path alias `@/*` → `./src/*`; Tailwind color tokens `primary` (`DEFAULT`/`dark`/`light`), `anthracite`, `accent`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "takwria-tn",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "prisma migrate dev",
    "db:migrate:test": "dotenv -e .env.test -- prisma migrate deploy"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-auth": "^4.24.7",
    "@prisma/client": "^5.20.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/bcryptjs": "^2.4.6",
    "prisma": "^5.20.0",
    "dotenv-cli": "^7.4.2",
    "tailwindcss": "^3.4.10",
    "postcss": "^8.4.41",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.0",
    "eslint-config-next": "^15.0.0",
    "vitest": "^2.1.1",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.5.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 4: Create `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B7A43",
          dark: "#125C31",
          light: "#2E9C5C",
        },
        anthracite: "#22262B",
        accent: "#F5B301",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: Create `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create `.eslintrc.json`**

```json
{
  "extends": ["next/core-web-vitals"]
}
```

- [ ] **Step 7: Create `.gitignore`**

```
# dependencies
/node_modules

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# env
.env
.env.test
.env*.local

# typescript
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 8: Create `.env.example`**

```
DATABASE_URL="postgresql://takwria:takwria@localhost:5432/takwria_dev"
DATABASE_URL_TEST="postgresql://takwria:takwria@localhost:5433/takwria_test"
NEXTAUTH_SECRET="change-me-in-dev"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 9: Create `.env.test.example`**

```
DATABASE_URL="postgresql://takwria:takwria@localhost:5433/takwria_test"
```

(This file is consumed only by `npm run db:migrate:test` to point the Prisma CLI at the test database; app code reads `DATABASE_URL_TEST` from `.env` instead — see Task 2.)

- [ ] **Step 10: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: takwria
      POSTGRES_PASSWORD: takwria
      POSTGRES_DB: takwria_dev
    ports:
      - "5432:5432"
    volumes:
      - takwria_db_data:/var/lib/postgresql/data

  db_test:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: takwria
      POSTGRES_PASSWORD: takwria
      POSTGRES_DB: takwria_test
    ports:
      - "5433:5432"

volumes:
  takwria_db_data:
```

- [ ] **Step 11: Create `README.md`**

```markdown
# Takwria TN

Trouve ton terrain. Forme ton équipe. Joue ton match.

Sous-projet actuel : **Fondations & Authentification** (voir
`docs/superpowers/specs/2026-08-18-foundation-auth-design.md`).

## Prérequis

- Node.js 20+
- Docker (pour PostgreSQL en local)

## Installation

\`\`\`bash
npm install
cp .env.example .env
cp .env.test.example .env.test
docker compose up -d
npm run db:migrate       # applique le schéma sur la base de dev
npm run db:migrate:test  # applique le schéma sur la base de test
\`\`\`

## Développement

\`\`\`bash
npm run dev     # démarre l'app sur http://localhost:3000
npm test        # lance la suite de tests (Vitest)
npm run lint    # vérifie le code (ESLint)
npm run build   # build de production
\`\`\`

En développement, les liens de réinitialisation de mot de passe sont
affichés dans la console du serveur (pas d'envoi d'e-mail réel pour
l'instant).
```

- [ ] **Step 12: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 13: Create `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 14: Create placeholder `src/app/layout.tsx`**

```tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 15: Create placeholder `src/app/page.tsx`**

```tsx
export default function HomePage() {
  return <main>Takwria TN</main>;
}
```

(Both files are replaced with the full implementation in Task 10.)

- [ ] **Step 16: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL_TEST:
        process.env.DATABASE_URL_TEST ??
        "postgresql://takwria:takwria@localhost:5433/takwria_test",
      NEXTAUTH_SECRET: "test-secret",
      NEXTAUTH_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 17: Create `tests/setup/vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 18: Create sanity test `tests/setup/sanity.test.ts`**

```ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 19: Install dependencies**

Run: `npm install`
If it reports peer-dependency conflicts (Next 15 / React 19 vs. next-auth 4), rerun: `npm install --legacy-peer-deps`
Expected: install completes, `node_modules/` created.

- [ ] **Step 20: Verify the Next.js build works**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 21: Verify the test harness works**

Run: `npm test`
Expected: 1 test file, 1 test, PASS.

- [ ] **Step 22: Start the local databases**

Run: `docker compose up -d`
Expected: `docker ps` shows two running containers (ports 5432 and 5433).

- [ ] **Step 23: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with Tailwind, Prisma and Vitest"
```

---

## Task 2: Prisma Schema, Migrations & Client

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Create: `tests/setup/testDb.ts`
- Test: `tests/lib/prisma.test.ts`

**Interfaces:**
- Consumes: `.env` `DATABASE_URL`, `.env` `DATABASE_URL_TEST` (from Task 1).
- Produces: `prisma` (singleton `PrismaClient`) from `@/lib/prisma`, pointed at `DATABASE_URL_TEST` whenever `NODE_ENV === "test"`. `resetDb()` from `../setup/testDb` (relative to `tests/`). Prisma models `User`, `PlayerProfile`, `PasswordResetToken`, enum `Role`.

- [ ] **Step 1: Copy env templates to real env files**

Run: `cp .env.example .env` and `cp .env.test.example .env.test` (on Windows PowerShell: `Copy-Item .env.example .env; Copy-Item .env.test.example .env.test`)
Expected: `.env` and `.env.test` exist locally (both gitignored).

- [ ] **Step 2: Add the data models to `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  joueur
  proprietaire
  administrateur
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(joueur)
  createdAt    DateTime @default(now())

  profile     PlayerProfile?
  resetTokens PasswordResetToken[]
}

model PlayerProfile {
  userId      String  @id
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  prenom      String
  ville       String
  poste       String?
  niveau      String?
  piedPrefere String?
  telephone   String?
  photoUrl    String?
  bio         String?
}

model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
}
```

- [ ] **Step 3: Apply the schema to the dev database**

Run: `npm run db:migrate -- --name init`
Expected: prompts complete non-interactively (or accept defaults), creates `prisma/migrations/<timestamp>_init/`, dev DB now has `User`, `PlayerProfile`, `PasswordResetToken` tables.

- [ ] **Step 4: Apply the same migration to the test database**

Run: `npm run db:migrate:test`
Expected: "The following migration(s) have been applied" against `takwria_test`.

- [ ] **Step 5: Create `src/lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl =
  process.env.NODE_ENV === "test"
    ? process.env.DATABASE_URL_TEST
    : process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 6: Create `tests/setup/testDb.ts`**

```ts
import { prisma } from "@/lib/prisma";

export async function resetDb() {
  await prisma.passwordResetToken.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.user.deleteMany();
}
```

- [ ] **Step 7: Write the failing test `tests/lib/prisma.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";

describe("prisma test database", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates and reads back a user against the test database", async () => {
    const user = await prisma.user.create({
      data: { email: "check@example.com", passwordHash: "x" },
    });

    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe("check@example.com");
  });

  it("resetDb clears users between tests", async () => {
    const count = await prisma.user.count();
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 8: Run the test**

Run: `npm test -- tests/lib/prisma.test.ts`
Expected: PASS (2 tests). If it fails to connect, confirm `docker compose ps` shows `db_test` running on port 5433.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema, migrations and shared client"
```

---

## Task 3: Password Hashing & Auth Validation Schemas

**Files:**
- Create: `src/lib/password.ts`
- Create: `src/lib/validation/auth.ts`
- Test: `tests/lib/password.test.ts`
- Test: `tests/lib/validation/auth.test.ts`

**Interfaces:**
- Produces: `hashPassword(password: string): Promise<string>`, `verifyPassword(password: string, hash: string): Promise<boolean>` from `@/lib/password`. `signupSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema` (zod) and their inferred types `SignupInput`, `LoginInput` from `@/lib/validation/auth`.

- [ ] **Step 1: Write the failing test `tests/lib/password.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("motdepasse123");
    expect(hash).not.toBe("motdepasse123");
    expect(await verifyPassword("motdepasse123", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("motdepasse123");
    expect(await verifyPassword("mauvais-mdp", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/password.test.ts`
Expected: FAIL — cannot find module `@/lib/password`.

- [ ] **Step 3: Create `src/lib/password.ts`**

```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/password.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test `tests/lib/validation/auth.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

describe("signupSchema", () => {
  it("accepts a valid payload", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      email: "pas-un-email",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "1234567",
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts email + password", () => {
    const result = loginSchema.safeParse({
      email: "a@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@example.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires a token and a valid new password", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc123",
      password: "motdepasse123",
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/lib/validation/auth.test.ts`
Expected: FAIL — cannot find module `@/lib/validation/auth`.

- [ ] **Step 7: Create `src/lib/validation/auth.ts`**

```ts
import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  prenom: z.string().min(1, "Le prénom est requis"),
  ville: z.string().min(1, "La ville est requise"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- tests/lib/validation/auth.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add password hashing and auth validation schemas"
```

---

## Task 4: Password Reset Token Utility

**Files:**
- Create: `src/lib/resetToken.ts`
- Test: `tests/lib/resetToken.test.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma` (Task 2), `resetDb` from `tests/setup/testDb` (Task 2), `hashPassword` from `@/lib/password` (Task 3).
- Produces: `generateToken(): string`, `createPasswordResetToken(userId: string): Promise<string>`, `consumePasswordResetToken(token: string): Promise<{ valid: true; userId: string } | { valid: false; reason: "not_found" | "used" | "expired" }>` from `@/lib/resetToken`.

- [ ] **Step 1: Write the failing test `tests/lib/resetToken.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  createPasswordResetToken,
  consumePasswordResetToken,
} from "@/lib/resetToken";

async function createTestUser(email: string) {
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword("motdepasse123") },
  });
}

describe("password reset tokens", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a token that can be consumed once", async () => {
    const user = await createTestUser("reset@example.com");
    const token = await createPasswordResetToken(user.id);

    const result = await consumePasswordResetToken(token);
    expect(result).toEqual({ valid: true, userId: user.id });

    const secondAttempt = await consumePasswordResetToken(token);
    expect(secondAttempt).toEqual({ valid: false, reason: "used" });
  });

  it("rejects an unknown token", async () => {
    const result = await consumePasswordResetToken("unknown-token");
    expect(result).toEqual({ valid: false, reason: "not_found" });
  });

  it("rejects an expired token", async () => {
    const user = await createTestUser("expired@example.com");
    const token = "expired-token-123";
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await consumePasswordResetToken(token);
    expect(result).toEqual({ valid: false, reason: "expired" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/resetToken.test.ts`
Expected: FAIL — cannot find module `@/lib/resetToken`.

- [ ] **Step 3: Create `src/lib/resetToken.ts`**

```ts
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 heure

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(userId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await prisma.passwordResetToken.create({
    data: { userId, token, expiresAt },
  });
  return token;
}

export async function consumePasswordResetToken(token: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record) return { valid: false as const, reason: "not_found" as const };
  if (record.usedAt) return { valid: false as const, reason: "used" as const };
  if (record.expiresAt < new Date())
    return { valid: false as const, reason: "expired" as const };

  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });
  return { valid: true as const, userId: record.userId };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/resetToken.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add password reset token generation and validation"
```

---

## Task 5: NextAuth Configuration

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/types/next-auth.d.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Test: `tests/lib/auth.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `verifyPassword` (Task 3), `loginSchema` (Task 3).
- Produces: `authorizeCredentials(credentials: Record<string, string> | undefined): Promise<{ id: string; email: string; role: string } | null>` and `authOptions: NextAuthOptions` from `@/lib/auth`. `session.user.id: string`, `session.user.role: string` typed globally via `next-auth.d.ts` for all later tasks.

- [ ] **Step 1: Write the failing test `tests/lib/auth.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { authorizeCredentials } from "@/lib/auth";

describe("authorizeCredentials", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the user for valid credentials", async () => {
    await prisma.user.create({
      data: {
        email: "joueur@example.com",
        passwordHash: await hashPassword("motdepasse123"),
      },
    });

    const result = await authorizeCredentials({
      email: "joueur@example.com",
      password: "motdepasse123",
    });
    expect(result).toMatchObject({ email: "joueur@example.com", role: "joueur" });
  });

  it("returns null for a wrong password", async () => {
    await prisma.user.create({
      data: {
        email: "joueur@example.com",
        passwordHash: await hashPassword("motdepasse123"),
      },
    });

    const result = await authorizeCredentials({
      email: "joueur@example.com",
      password: "faux",
    });
    expect(result).toBeNull();
  });

  it("returns null for an unknown e-mail", async () => {
    const result = await authorizeCredentials({
      email: "inconnu@example.com",
      password: "motdepasse123",
    });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/auth.test.ts`
Expected: FAIL — cannot find module `@/lib/auth`.

- [ ] **Step 3: Create `src/types/next-auth.d.ts`**

```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
```

- [ ] **Step 4: Create `src/lib/auth.ts`**

```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation/auth";

export async function authorizeCredentials(
  credentials: Record<string, string> | undefined
) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return null;

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, role: user.role };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/connexion",
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: (credentials) =>
        authorizeCredentials(credentials as Record<string, string> | undefined),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
```

- [ ] **Step 5: Create `src/app/api/auth/[...nextauth]/route.ts`**

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- tests/lib/auth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: configure NextAuth credentials provider"
```

---

## Task 6: Inscription API Route

**Files:**
- Create: `src/app/api/inscription/route.ts`
- Test: `tests/api/inscription.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `hashPassword` (Task 3), `signupSchema` (Task 3).
- Produces: `POST(request: Request): Promise<Response>` from `@/app/api/inscription/route`, returning `201` with `{ id, email }` on success, `400` with `{ error: Record<string, string[]> }` on invalid payload, `409` with `{ error: { email: string[] } }` on duplicate e-mail.

- [ ] **Step 1: Write the failing test `tests/api/inscription.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { POST } from "@/app/api/inscription/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/inscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/inscription", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a user and profile with valid data", async () => {
    const response = await POST(
      makeRequest({
        email: "nouveau@example.com",
        password: "motdepasse123",
        prenom: "Sami",
        ville: "Tunis",
      })
    );

    expect(response.status).toBe(201);
    const user = await prisma.user.findUnique({
      where: { email: "nouveau@example.com" },
      include: { profile: true },
    });
    expect(user?.profile?.prenom).toBe("Sami");
  });

  it("rejects a duplicate e-mail", async () => {
    await POST(
      makeRequest({ email: "dup@example.com", password: "motdepasse123", prenom: "A", ville: "Tunis" })
    );

    const response = await POST(
      makeRequest({ email: "dup@example.com", password: "autremdp123", prenom: "B", ville: "Sfax" })
    );

    expect(response.status).toBe(409);
  });

  it("rejects an invalid payload", async () => {
    const response = await POST(makeRequest({ email: "pas-un-email", password: "123" }));
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/inscription.test.ts`
Expected: FAIL — cannot find module `@/app/api/inscription/route`.

- [ ] **Step 3: Create `src/app/api/inscription/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signupSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, password, prenom, ville } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: { email: ["Cet e-mail est déjà utilisé"] } },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      profile: { create: { prenom, ville } },
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/inscription.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add inscription API route"
```

---

## Task 7: Mot de passe oublié API Route

**Files:**
- Create: `src/app/api/mot-de-passe-oublie/route.ts`
- Test: `tests/api/mot-de-passe-oublie.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `forgotPasswordSchema` (Task 3), `createPasswordResetToken` (Task 4).
- Produces: `POST(request: Request): Promise<Response>` from `@/app/api/mot-de-passe-oublie/route`, always returning `200` with `{ message: "Si ce compte existe, un e-mail a été envoyé." }` regardless of whether the e-mail exists.

- [ ] **Step 1: Write the failing test `tests/api/mot-de-passe-oublie.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { POST } from "@/app/api/mot-de-passe-oublie/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/mot-de-passe-oublie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/mot-de-passe-oublie", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a reset token for a known e-mail", async () => {
    const user = await prisma.user.create({
      data: { email: "connu@example.com", passwordHash: await hashPassword("motdepasse123") },
    });

    const response = await POST(makeRequest({ email: "connu@example.com" }));
    expect(response.status).toBe(200);

    const tokens = await prisma.passwordResetToken.findMany({ where: { userId: user.id } });
    expect(tokens).toHaveLength(1);
  });

  it("returns the same generic response for an unknown e-mail", async () => {
    const response = await POST(makeRequest({ email: "inconnu@example.com" }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Si ce compte existe, un e-mail a été envoyé.");
  });

  it("rejects an invalid payload", async () => {
    const response = await POST(makeRequest({ email: "pas-un-email" }));
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/mot-de-passe-oublie.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/app/api/mot-de-passe-oublie/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { createPasswordResetToken } from "@/lib/resetToken";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reinitialiser-mot-de-passe/${token}`;
    console.log(`[reset-password] lien pour ${user.email} : ${resetUrl}`);
  }

  return NextResponse.json({ message: "Si ce compte existe, un e-mail a été envoyé." });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/mot-de-passe-oublie.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add forgot-password API route"
```

---

## Task 8: Réinitialiser mot de passe API Route

**Files:**
- Create: `src/app/api/reinitialiser-mot-de-passe/route.ts`
- Test: `tests/api/reinitialiser-mot-de-passe.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `resetPasswordSchema` (Task 3), `consumePasswordResetToken` (Task 4), `hashPassword` (Task 3).
- Produces: `POST(request: Request): Promise<Response>` from `@/app/api/reinitialiser-mot-de-passe/route`, `200` with `{ message: "Mot de passe mis à jour." }` on success, `400` with `{ error: { token: string[] } }` on invalid/expired/used token, `400` with `{ error: Record<string, string[]> }` on invalid payload.

- [ ] **Step 1: Write the failing test `tests/api/reinitialiser-mot-de-passe.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createPasswordResetToken } from "@/lib/resetToken";
import { POST } from "@/app/api/reinitialiser-mot-de-passe/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/reinitialiser-mot-de-passe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reinitialiser-mot-de-passe", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates the password for a valid token", async () => {
    const user = await prisma.user.create({
      data: { email: "reset@example.com", passwordHash: await hashPassword("ancienmdp1") },
    });
    const token = await createPasswordResetToken(user.id);

    const response = await POST(makeRequest({ token, password: "nouveaumdp1" }));
    expect(response.status).toBe(200);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await verifyPassword("nouveaumdp1", updated.passwordHash)).toBe(true);
  });

  it("rejects an unknown token", async () => {
    const response = await POST(makeRequest({ token: "inconnu", password: "nouveaumdp1" }));
    expect(response.status).toBe(400);
  });

  it("rejects a token that was already used", async () => {
    const user = await prisma.user.create({
      data: { email: "reuse@example.com", passwordHash: await hashPassword("ancienmdp1") },
    });
    const token = await createPasswordResetToken(user.id);
    await POST(makeRequest({ token, password: "nouveaumdp1" }));

    const response = await POST(makeRequest({ token, password: "autremdp2" }));
    expect(response.status).toBe(400);
  });

  it("rejects an invalid payload", async () => {
    const response = await POST(makeRequest({ token: "", password: "123" }));
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api/reinitialiser-mot-de-passe.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/app/api/reinitialiser-mot-de-passe/route.ts`**

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { consumePasswordResetToken } from "@/lib/resetToken";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const result = await consumePasswordResetToken(parsed.data.token);
  if (!result.valid) {
    const message =
      result.reason === "expired"
        ? "Ce lien a expiré, veuillez en redemander un."
        : "Ce lien n'est plus valide, veuillez en redemander un.";
    return NextResponse.json({ error: { token: [message] } }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: result.userId },
    data: { passwordHash },
  });

  return NextResponse.json({ message: "Mot de passe mis à jour." });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api/reinitialiser-mot-de-passe.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add reset-password API route"
```

---

## Task 9: Profil API Routes & Route Protection

**Files:**
- Create: `src/lib/validation/profil.ts`
- Create: `src/app/api/profil/route.ts`
- Create: `src/middleware.ts`
- Test: `tests/lib/validation/profil.test.ts`
- Test: `tests/api/profil.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 2), `authOptions` (Task 5).
- Produces: `profilSchema`, `ProfilInput` from `@/lib/validation/profil`. `GET(): Promise<Response>` and `PUT(request: Request): Promise<Response>` from `@/app/api/profil/route`, both `401` when unauthenticated. Middleware protecting `/profil/:path*` and `/tableau-de-bord/:path*`.

- [ ] **Step 1: Write the failing test `tests/lib/validation/profil.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { profilSchema } from "@/lib/validation/profil";

describe("profilSchema", () => {
  it("accepts a minimal valid profile", () => {
    const result = profilSchema.safeParse({ prenom: "Amine", ville: "Sousse" });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields with allowed enum values", () => {
    const result = profilSchema.safeParse({
      prenom: "Amine",
      ville: "Sousse",
      poste: "milieu",
      niveau: "avance",
      piedPrefere: "droit",
      telephone: "20123456",
      bio: "Joueur passionné",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid poste value", () => {
    const result = profilSchema.safeParse({ prenom: "Amine", ville: "Sousse", poste: "capitaine" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing prenom", () => {
    const result = profilSchema.safeParse({ ville: "Sousse" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/lib/validation/profil.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/lib/validation/profil.ts`**

```ts
import { z } from "zod";

export const profilSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis"),
  ville: z.string().min(1, "La ville est requise"),
  poste: z.enum(["gardien", "defenseur", "milieu", "attaquant"]).optional(),
  niveau: z.enum(["debutant", "intermediaire", "avance"]).optional(),
  piedPrefere: z.enum(["gauche", "droit", "ambidextre"]).optional(),
  telephone: z.string().optional(),
  bio: z.string().max(500, "La bio ne peut pas dépasser 500 caractères").optional(),
});

export type ProfilInput = z.infer<typeof profilSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/lib/validation/profil.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing test `tests/api/profil.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { GET, PUT } from "@/app/api/profil/route";

function makePutRequest(body: unknown) {
  return new Request("http://localhost/api/profil", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/profil", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the profile for an authenticated user", async () => {
    const user = await prisma.user.create({
      data: {
        email: "profil@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "Amine", ville: "Sousse" } },
      },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await GET();
    const body = await response.json();
    expect(body.prenom).toBe("Amine");
  });

  it("updates the profile with valid data", async () => {
    const user = await prisma.user.create({
      data: {
        email: "profil2@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "Amine", ville: "Sousse" } },
      },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await PUT(
      makePutRequest({ prenom: "Amine K.", ville: "Sousse", niveau: "avance" })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.prenom).toBe("Amine K.");
    expect(body.niveau).toBe("avance");
  });

  it("rejects an invalid payload with 400", async () => {
    const user = await prisma.user.create({
      data: {
        email: "profil3@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "Amine", ville: "Sousse" } },
      },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await PUT(makePutRequest({ prenom: "", ville: "Sousse" }));
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- tests/api/profil.test.ts`
Expected: FAIL — cannot find module `@/app/api/profil/route`.

- [ ] **Step 7: Create `src/app/api/profil/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profilSchema } from "@/lib/validation/profil";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profilSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const profile = await prisma.playerProfile.update({
    where: { userId: session.user.id },
    data: parsed.data,
  });

  return NextResponse.json(profile);
}
```

- [ ] **Step 8: Create `src/middleware.ts`**

```ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/profil/:path*", "/tableau-de-bord/:path*"],
};
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- tests/api/profil.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add profil API routes and route protection middleware"
```

---

## Task 10: UI Shell — Layout, Navigation, Home & Stub Pages

**Files:**
- Create: `src/components/providers/SessionProvider.tsx`
- Create: `src/components/nav/BottomNav.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/terrains/page.tsx`
- Create: `src/app/matchs/page.tsx`
- Create: `src/app/joueurs/page.tsx`
- Create: `src/app/tableau-de-bord/page.tsx`
- Test: `tests/components/BottomNav.test.tsx`

**Interfaces:**
- Consumes: `authOptions` (Task 5), Tailwind color tokens `primary`/`anthracite` (Task 1).
- Produces: `<SessionProvider>` wrapper, `<BottomNav>` component (used by `layout.tsx`), page components for `/`, `/terrains`, `/matchs`, `/joueurs`, `/tableau-de-bord`.

- [ ] **Step 1: Write the failing test `tests/components/BottomNav.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomNav } from "@/components/nav/BottomNav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: "unauthenticated" }),
}));

describe("BottomNav", () => {
  it("links Profil to /connexion when logged out", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "Profil" })).toHaveAttribute("href", "/connexion");
  });

  it("renders all primary nav items", () => {
    render(<BottomNav />);
    ["Accueil", "Terrains", "Matchs", "Joueurs"].forEach((label) => {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/BottomNav.test.tsx`
Expected: FAIL — cannot find module `@/components/nav/BottomNav`.

- [ ] **Step 3: Create `src/components/providers/SessionProvider.tsx`**

```tsx
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

- [ ] **Step 4: Create `src/components/nav/BottomNav.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/terrains", label: "Terrains" },
  { href: "/matchs", label: "Matchs" },
  { href: "/joueurs", label: "Joueurs" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const profilHref = status === "authenticated" ? "/profil" : "/connexion";

  const items = [...links, { href: profilHref, label: "Profil" }];

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-gray-200 bg-white py-2">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`text-sm ${pathname === item.href ? "font-semibold text-primary" : "text-anthracite"}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/components/BottomNav.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { BottomNav } from "@/components/nav/BottomNav";

export const metadata: Metadata = {
  title: "Takwria TN",
  description: "Trouve ton terrain. Forme ton équipe. Joue ton match.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-white pb-16 text-anthracite">
        <SessionProvider>
          {children}
          <BottomNav />
        </SessionProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Replace `src/app/page.tsx`**

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center gap-6 px-4 py-10 text-center">
      <h1 className="text-3xl font-bold text-primary">Takwria TN</h1>
      <p className="text-lg">Trouve ton terrain. Forme ton équipe. Joue ton match.</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link href="/terrains" className="rounded-lg bg-primary px-4 py-3 font-semibold text-white">
          Réserver un terrain
        </Link>
        <Link
          href="/matchs"
          className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary"
        >
          Rejoindre un match
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Create `src/app/terrains/page.tsx`**

```tsx
export default function TerrainsPage() {
  return (
    <main className="px-4 py-10 text-center">
      <h1 className="text-xl font-semibold">Terrains</h1>
      <p className="mt-2 text-gray-600">Cette page arrive bientôt.</p>
    </main>
  );
}
```

- [ ] **Step 9: Create `src/app/matchs/page.tsx`**

```tsx
export default function MatchsPage() {
  return (
    <main className="px-4 py-10 text-center">
      <h1 className="text-xl font-semibold">Matchs</h1>
      <p className="mt-2 text-gray-600">Cette page arrive bientôt.</p>
    </main>
  );
}
```

- [ ] **Step 10: Create `src/app/joueurs/page.tsx`**

```tsx
export default function JoueursPage() {
  return (
    <main className="px-4 py-10 text-center">
      <h1 className="text-xl font-semibold">Joueurs</h1>
      <p className="mt-2 text-gray-600">Cette page arrive bientôt.</p>
    </main>
  );
}
```

- [ ] **Step 11: Create `src/app/tableau-de-bord/page.tsx`**

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function TableauDeBordPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="px-4 py-10">
      <h1 className="text-xl font-semibold">Tableau de bord</h1>
      <p className="mt-2 text-gray-600">
        Bienvenue {session?.user?.email}. Vos réservations et matchs apparaîtront ici bientôt.
      </p>
    </main>
  );
}
```

- [ ] **Step 12: Run the full test suite and build**

Run: `npm test && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add UI shell, navigation and stub pages"
```

---

## Task 11: Inscription & Connexion Pages/Forms

**Files:**
- Create: `src/components/forms/InscriptionForm.tsx`
- Create: `src/components/forms/ConnexionForm.tsx`
- Create: `src/app/inscription/page.tsx`
- Create: `src/app/connexion/page.tsx`
- Test: `tests/components/InscriptionForm.test.tsx`
- Test: `tests/components/ConnexionForm.test.tsx`

**Interfaces:**
- Consumes: `POST /api/inscription` (Task 6), NextAuth `signIn` (Task 5), Tailwind tokens (Task 1).
- Produces: `<InscriptionForm>`, `<ConnexionForm>` client components; `/inscription`, `/connexion` pages.

- [ ] **Step 1: Write the failing test `tests/components/InscriptionForm.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InscriptionForm } from "@/components/forms/InscriptionForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("InscriptionForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    global.fetch = vi.fn();
  });

  it("submits the form and redirects on success", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "1", email: "sami@example.com" }),
    } as Response);

    render(<InscriptionForm />);
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Sami" } });
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Tunis" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/connexion?inscription=reussie")
    );
  });

  it("shows a field error returned by the server", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { email: ["Cet e-mail est déjà utilisé"] } }),
    } as Response);

    render(<InscriptionForm />);
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Sami" } });
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Tunis" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "dup@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByText("Cet e-mail est déjà utilisé")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/InscriptionForm.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/components/forms/InscriptionForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function InscriptionForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prenom, setPrenom] = useState("");
  const [ville, setVille] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});

    const response = await fetch("/api/inscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, prenom, ville }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json();
      setErrors(body.error ?? {});
      return;
    }

    router.push("/connexion?inscription=reussie");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="prenom" className="block text-sm font-medium">Prénom</label>
        <input
          id="prenom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.prenom && <p className="mt-1 text-sm text-red-600">{errors.prenom[0]}</p>}
      </div>
      <div>
        <label htmlFor="ville" className="block text-sm font-medium">Ville</label>
        <input
          id="ville"
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.ville && <p className="mt-1 text-sm text-red-600">{errors.ville[0]}</p>}
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password[0]}</p>}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Création..." : "Créer mon compte"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/InscriptionForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Create `src/app/inscription/page.tsx`**

```tsx
import { InscriptionForm } from "@/components/forms/InscriptionForm";

export default function InscriptionPage() {
  return (
    <main className="px-4 py-6">
      <h1 className="text-center text-xl font-semibold">Créer un compte</h1>
      <InscriptionForm />
    </main>
  );
}
```

- [ ] **Step 6: Write the failing test `tests/components/ConnexionForm.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConnexionForm } from "@/components/forms/ConnexionForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const signInMock = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

describe("ConnexionForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInMock.mockReset();
  });

  it("redirects to the dashboard on successful login", async () => {
    signInMock.mockResolvedValue({ error: null });

    render(<ConnexionForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/tableau-de-bord"));
  });

  it("shows a generic error on invalid credentials", async () => {
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });

    render(<ConnexionForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "faux" } });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Identifiants invalides")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- tests/components/ConnexionForm.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 8: Create `src/components/forms/ConnexionForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function ConnexionForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await signIn("credentials", { email, password, redirect: false });
    setSubmitting(false);

    if (result?.error) {
      setError("Identifiants invalides");
      return;
    }

    router.push("/tableau-de-bord");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- tests/components/ConnexionForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 10: Create `src/app/connexion/page.tsx`**

```tsx
import { ConnexionForm } from "@/components/forms/ConnexionForm";

export default function ConnexionPage() {
  return (
    <main className="px-4 py-6">
      <h1 className="text-center text-xl font-semibold">Se connecter</h1>
      <ConnexionForm />
    </main>
  );
}
```

- [ ] **Step 11: Run full suite and build**

Run: `npm test && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add inscription and connexion pages"
```

---

## Task 12: Mot de passe oublié & Réinitialiser mot de passe Pages/Forms

**Files:**
- Create: `src/components/forms/MotDePasseOublieForm.tsx`
- Create: `src/components/forms/ReinitialiserMotDePasseForm.tsx`
- Create: `src/app/mot-de-passe-oublie/page.tsx`
- Create: `src/app/reinitialiser-mot-de-passe/[token]/page.tsx`
- Test: `tests/components/MotDePasseOublieForm.test.tsx`
- Test: `tests/components/ReinitialiserMotDePasseForm.test.tsx`

**Interfaces:**
- Consumes: `POST /api/mot-de-passe-oublie` (Task 7), `POST /api/reinitialiser-mot-de-passe` (Task 8), Tailwind tokens (Task 1).
- Produces: `<MotDePasseOublieForm>`, `<ReinitialiserMotDePasseForm token: string>`; `/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe/[token]` pages.

- [ ] **Step 1: Write the failing test `tests/components/MotDePasseOublieForm.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MotDePasseOublieForm } from "@/components/forms/MotDePasseOublieForm";

describe("MotDePasseOublieForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("shows a generic success message after submission", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Si ce compte existe, un e-mail a été envoyé." }),
    } as Response);

    render(<MotDePasseOublieForm />);
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer le lien" }));

    await waitFor(() =>
      expect(screen.getByText("Si ce compte existe, un e-mail a été envoyé.")).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/MotDePasseOublieForm.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/components/forms/MotDePasseOublieForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";

export function MotDePasseOublieForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    const response = await fetch("/api/mot-de-passe-oublie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSubmitting(false);
    const body = await response.json();
    setMessage(body.message ?? "Si ce compte existe, un e-mail a été envoyé.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>
      {message && <p className="text-sm text-primary">{message}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Envoi..." : "Envoyer le lien"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/MotDePasseOublieForm.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Create `src/app/mot-de-passe-oublie/page.tsx`**

```tsx
import { MotDePasseOublieForm } from "@/components/forms/MotDePasseOublieForm";

export default function MotDePasseOubliePage() {
  return (
    <main className="px-4 py-6">
      <h1 className="text-center text-xl font-semibold">Mot de passe oublié</h1>
      <MotDePasseOublieForm />
    </main>
  );
}
```

- [ ] **Step 6: Write the failing test `tests/components/ReinitialiserMotDePasseForm.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReinitialiserMotDePasseForm } from "@/components/forms/ReinitialiserMotDePasseForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("ReinitialiserMotDePasseForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    global.fetch = vi.fn();
  });

  it("submits the token and new password, then redirects", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Mot de passe mis à jour." }),
    } as Response);

    render(<ReinitialiserMotDePasseForm token="abc123" />);
    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "nouveaumdp1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/connexion?reinitialisation=reussie")
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/reinitialiser-mot-de-passe",
      expect.objectContaining({
        body: JSON.stringify({ token: "abc123", password: "nouveaumdp1" }),
      })
    );
  });

  it("shows the server error when the token is invalid", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { token: ["Ce lien n'est plus valide, veuillez en redemander un."] } }),
    } as Response);

    render(<ReinitialiserMotDePasseForm token="abc123" />);
    fireEvent.change(screen.getByLabelText("Nouveau mot de passe"), {
      target: { value: "nouveaumdp1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(
      await screen.findByText("Ce lien n'est plus valide, veuillez en redemander un.")
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- tests/components/ReinitialiserMotDePasseForm.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 8: Create `src/components/forms/ReinitialiserMotDePasseForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ReinitialiserMotDePasseForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/reinitialiser-mot-de-passe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json();
      setError(body.error?.token?.[0] ?? "Une erreur est survenue.");
      return;
    }

    router.push("/connexion?reinitialisation=reussie");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Nouveau mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Enregistrement..." : "Réinitialiser"}
      </button>
    </form>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- tests/components/ReinitialiserMotDePasseForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 10: Create `src/app/reinitialiser-mot-de-passe/[token]/page.tsx`**

```tsx
import { ReinitialiserMotDePasseForm } from "@/components/forms/ReinitialiserMotDePasseForm";

export default function ReinitialiserMotDePassePage({
  params,
}: {
  params: { token: string };
}) {
  return (
    <main className="px-4 py-6">
      <h1 className="text-center text-xl font-semibold">Nouveau mot de passe</h1>
      <ReinitialiserMotDePasseForm token={params.token} />
    </main>
  );
}
```

- [ ] **Step 11: Run full suite and build**

Run: `npm test && npm run build`
Expected: all tests PASS, build succeeds.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add forgot-password and reset-password pages"
```

---

## Task 13: Profil Page & Form, Final Verification

**Files:**
- Create: `src/components/forms/ProfilForm.tsx`
- Create: `src/app/profil/page.tsx`
- Test: `tests/components/ProfilForm.test.tsx`

**Interfaces:**
- Consumes: `PUT /api/profil` (Task 9), `authOptions` + `prisma` for server-side fetch (Tasks 2, 5), Tailwind tokens (Task 1).
- Produces: `<ProfilForm profile: { prenom, ville, poste, niveau, piedPrefere, telephone, bio } >`; `/profil` page (protected by middleware from Task 9).

- [ ] **Step 1: Write the failing test `tests/components/ProfilForm.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfilForm } from "@/components/forms/ProfilForm";

const baseProfile = {
  prenom: "Amine",
  ville: "Sousse",
  poste: null,
  niveau: null,
  piedPrefere: null,
  telephone: null,
  bio: null,
};

describe("ProfilForm", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("pre-fills the form with the current profile", () => {
    render(<ProfilForm profile={baseProfile} />);
    expect(screen.getByLabelText("Prénom")).toHaveValue("Amine");
    expect(screen.getByLabelText("Ville")).toHaveValue("Sousse");
  });

  it("submits the updated profile and shows a success message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ ...baseProfile, ville: "Sfax" }),
    } as Response);

    render(<ProfilForm profile={baseProfile} />);
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Sfax" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(screen.getByText("Profil mis à jour.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/components/ProfilForm.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/components/forms/ProfilForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";

type Profile = {
  prenom: string;
  ville: string;
  poste: string | null;
  niveau: string | null;
  piedPrefere: string | null;
  telephone: string | null;
  bio: string | null;
};

export function ProfilForm({ profile }: { profile: Profile }) {
  const [prenom, setPrenom] = useState(profile.prenom);
  const [ville, setVille] = useState(profile.ville);
  const [poste, setPoste] = useState(profile.poste ?? "");
  const [niveau, setNiveau] = useState(profile.niveau ?? "");
  const [piedPrefere, setPiedPrefere] = useState(profile.piedPrefere ?? "");
  const [telephone, setTelephone] = useState(profile.telephone ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setMessage("");

    const response = await fetch("/api/profil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prenom,
        ville,
        poste: poste || undefined,
        niveau: niveau || undefined,
        piedPrefere: piedPrefere || undefined,
        telephone: telephone || undefined,
        bio: bio || undefined,
      }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json();
      setErrors(body.error ?? {});
      return;
    }

    setMessage("Profil mis à jour.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="prenom" className="block text-sm font-medium">Prénom</label>
        <input
          id="prenom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.prenom && <p className="mt-1 text-sm text-red-600">{errors.prenom[0]}</p>}
      </div>
      <div>
        <label htmlFor="ville" className="block text-sm font-medium">Ville</label>
        <input
          id="ville"
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.ville && <p className="mt-1 text-sm text-red-600">{errors.ville[0]}</p>}
      </div>
      <div>
        <label htmlFor="poste" className="block text-sm font-medium">Poste</label>
        <select
          id="poste"
          value={poste}
          onChange={(e) => setPoste(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Non renseigné</option>
          <option value="gardien">Gardien</option>
          <option value="defenseur">Défenseur</option>
          <option value="milieu">Milieu</option>
          <option value="attaquant">Attaquant</option>
        </select>
      </div>
      <div>
        <label htmlFor="niveau" className="block text-sm font-medium">Niveau</label>
        <select
          id="niveau"
          value={niveau}
          onChange={(e) => setNiveau(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Non renseigné</option>
          <option value="debutant">Débutant</option>
          <option value="intermediaire">Intermédiaire</option>
          <option value="avance">Avancé</option>
        </select>
      </div>
      <div>
        <label htmlFor="piedPrefere" className="block text-sm font-medium">Pied préféré</label>
        <select
          id="piedPrefere"
          value={piedPrefere}
          onChange={(e) => setPiedPrefere(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Non renseigné</option>
          <option value="gauche">Gauche</option>
          <option value="droit">Droit</option>
          <option value="ambidextre">Ambidextre</option>
        </select>
      </div>
      <div>
        <label htmlFor="telephone" className="block text-sm font-medium">Téléphone</label>
        <input
          id="telephone"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="bio" className="block text-sm font-medium">Présentation</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          rows={3}
        />
        {errors.bio && <p className="mt-1 text-sm text-red-600">{errors.bio[0]}</p>}
      </div>
      {message && <p className="text-sm text-primary">{message}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/components/ProfilForm.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Create `src/app/profil/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilForm } from "@/components/forms/ProfilForm";

export default async function ProfilPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    redirect("/connexion");
  }

  return (
    <main className="px-4 py-6">
      <h1 className="text-center text-xl font-semibold">Mon profil</h1>
      <ProfilForm profile={profile} />
    </main>
  );
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: every test file in `tests/` PASSES.

- [ ] **Step 7: Lint and build**

Run: `npm run lint && npm run build`
Expected: no lint errors, production build succeeds.

- [ ] **Step 8: Manual smoke test**

Run: `npm run dev`, then in a browser:
1. Visit `/inscription`, create an account → redirected to `/connexion?inscription=reussie`.
2. Log in with those credentials → redirected to `/tableau-de-bord`, shows your e-mail.
3. Visit `/profil`, edit and save a field → success message shown, reload the page to confirm it persisted.
4. Visit `/mot-de-passe-oublie`, submit your e-mail → check the server console for the logged reset link, open it, set a new password → redirected to `/connexion?reinitialisation=reussie`.
5. Log in with the new password → succeeds.
6. Log out (or open an incognito window) and visit `/profil` directly → redirected to `/connexion`.

Expected: all six steps behave as described.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add profil page and complete foundation & auth sub-project"
```

---

## Done Criteria

- All tasks' checkboxes are checked and all commits made.
- `npm test`, `npm run lint`, and `npm run build` all succeed from a clean clone (after `docker compose up -d` + `npm run db:migrate` + `npm run db:migrate:test`).
- The manual smoke test in Task 13 Step 8 passes end-to-end.
- This sub-project (Foundation & Auth) is ready to serve as the base for sub-project 2 (Terrains).
