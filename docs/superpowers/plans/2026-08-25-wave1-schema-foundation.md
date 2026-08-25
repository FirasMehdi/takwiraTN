# Wave 1 — Schema Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the schema/query-layer foundation the rest of the "TakiwiraTN — Existing Application Feature Expansion" spec builds on, without breaking anything already shipped: multi-format terrain pricing, a unified `Conversation`-based messaging model (replacing the current 1:1-only `Message` pairing), and a new `Notification` model with minimal emission wiring.

**Architecture:** Additive-first: new tables (`TerrainFormatOffre`, `Conversation`, `ConversationParticipant`, `Notification`) plus one column move (`Message.destinataireId` → `Message.conversationId`) and one column removal on `Terrain` (`format`/`prixParCreneau` move into `TerrainFormatOffre` rows). The public TypeScript contract of `src/lib/messages/queries.ts` (`MessageResume`, `ConversationResume`, `envoyerMessage`, `findConversation`, `findConversations`) is preserved byte-for-byte in shape, so every existing consumer (API route, `/amis` pages, `ConversationThread`, `InviterAmiButton`) needs zero changes. `src/lib/terrains/queries.ts`'s contract does change (single `format`/`prixParCreneau` → `formats[]` + `prixAPartirDe`), so its consumers are updated in the same wave.

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma + PostgreSQL (Neon in prod, Docker Postgres locally), Zod, Vitest + React Testing Library.

**Spec:** The user's "TakiwiraTN — Existing Application Feature Expansion" request (33-section spec, delivered in chat, not saved to a file — see the session's architectural rulings below, which this plan implements verbatim). This plan covers only the schema-foundation slice; match/admin/hoster/notification-UI work is later waves.

## Global Constraints

- Never rebuild or duplicate an existing, working feature — extend in place. This plan modifies `src/lib/terrains/queries.ts` and `src/lib/messages/queries.ts` rather than creating parallel versions.
- All schema changes go through a real migration file (`prisma/migrations/`), never `prisma db push`.
- The public contract of `src/lib/messages/queries.ts` (function names, parameter order, return shapes) MUST NOT change — downstream consumers are not part of this plan's file list and must keep compiling and passing their existing tests untouched.
- `formatPrix` stores/returns millimes (1 DT = 1000 millimes) everywhere — never dinars in stored data.
- French UI strings, French domain vocabulary (`joueur`, `terrain`, `créneau`, etc.) — match the existing codebase's language throughout.
- Every new query function that touches user-supplied IDs must not trust the caller's authorization — this plan's functions are data-layer only (no session/authorization changes needed here since none of the touched routes gain new capabilities), but never weaken an existing check (e.g. `sontAmis` gating `envoyerMessage`) while refactoring around it.
- Run `npm test`, `npm run lint`, and `npm run build` before considering any task done; a task is not complete on "tests I wrote pass" alone.

---

## Task 1: Schema migration — multi-format terrains, unified conversations, notifications

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260825120000_wave1_foundation/migration.sql`

**Interfaces:**
- Produces (for Task 2/3): Prisma models `Terrain.formats TerrainFormatOffre[]`, `TerrainFormatOffre { id, terrainId, format: FormatEquipe, capacite: Int, prixParCreneau: Int }`, enum `FormatEquipe { quatre cinq six sept huit neuf onze }`. `Terrain.format` and `Terrain.prixParCreneau` no longer exist.
- Produces (for Task 4): `Conversation { id, estGroupe: Boolean, nom: String?, createdAt }`, `ConversationParticipant { id, conversationId, userId, joinedAt }` with `@@unique([conversationId, userId])`, `Message { id, conversationId, expediteurId, contenu, createdAt, luAt }` — `Message.destinataireId` no longer exists. `Notification { id, userId, type: String, contenu: String, lien: String?, lu: Boolean, createdAt }`.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Replace the `TerrainFormat` enum and the `Terrain` model's `format`/`prixParCreneau` fields, and add the new models. Below are every block that changes — apply each one exactly.

Replace:
```prisma
enum TerrainFormat {
  cinq
  sept
  onze
}
```
with:
```prisma
enum FormatEquipe {
  quatre
  cinq
  six
  sept
  huit
  neuf
  onze
}
```

In `model Terrain`, replace:
```prisma
  type   TerrainType
  format TerrainFormat

  prixParCreneau      Int
  dureeCreneauMinutes Int @default(90)
```
with:
```prisma
  type TerrainType

  dureeCreneauMinutes Int @default(90)
```

And in the same `model Terrain`, right after the `horaires TerrainHoraire[]` line, add:
```prisma
  formats  TerrainFormatOffre[]
```

Immediately after `model Terrain { ... }` closes (before `model TerrainHoraire`), add the new model:
```prisma
/** Un terrain peut être proposé en plusieurs formats (5v5, 7v7, 11v11...),
 *  chacun avec sa propre capacité et son propre tarif au créneau. */
model TerrainFormatOffre {
  id        String       @id @default(cuid())
  terrainId String
  terrain   Terrain      @relation(fields: [terrainId], references: [id], onDelete: Cascade)

  format         FormatEquipe
  capacite       Int
  prixParCreneau Int

  @@unique([terrainId, format])
  @@index([terrainId])
}
```

Replace the whole `model Message { ... }` block:
```prisma
model Message {
  id             String   @id @default(cuid())
  expediteurId   String
  expediteur     User     @relation("MessageExpediteur", fields: [expediteurId], references: [id], onDelete: Cascade)
  destinataireId String
  destinataire   User     @relation("MessageDestinataire", fields: [destinataireId], references: [id], onDelete: Cascade)

  contenu String

  createdAt DateTime  @default(now())
  luAt      DateTime?

  @@index([expediteurId, destinataireId])
  @@index([destinataireId, expediteurId])
}
```
with:
```prisma
model Conversation {
  id        String   @id @default(cuid())
  estGroupe Boolean  @default(false)
  nom       String?
  createdAt DateTime @default(now())

  participants ConversationParticipant[]
  messages     Message[]
}

model ConversationParticipant {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  joinedAt       DateTime     @default(now())

  @@unique([conversationId, userId])
  @@index([userId])
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  expediteurId   String
  expediteur     User         @relation("MessageExpediteur", fields: [expediteurId], references: [id], onDelete: Cascade)

  contenu String

  createdAt DateTime  @default(now())
  luAt      DateTime?

  @@index([conversationId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String
  contenu   String
  lien      String?
  lu        Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, lu])
}
```

In `model User`, replace:
```prisma
  demandesEnvoyees    Amitie[]  @relation("AmitieDemandeur")
  demandesRecues      Amitie[]  @relation("AmitieDestinataire")
  messagesEnvoyes     Message[] @relation("MessageExpediteur")
  messagesRecus       Message[] @relation("MessageDestinataire")
```
with:
```prisma
  demandesEnvoyees    Amitie[]  @relation("AmitieDemandeur")
  demandesRecues      Amitie[]  @relation("AmitieDestinataire")
  messagesEnvoyes     Message[] @relation("MessageExpediteur")
  conversations       ConversationParticipant[]
  notifications       Notification[]
```

- [ ] **Step 2: Write the migration SQL**

Create the directory `prisma/migrations/20260825120000_wave1_foundation/` and inside it `migration.sql` with exactly this content:

```sql
-- Wave 1 foundation: multi-format terrain pricing, unified conversations, notifications.
-- Every backfilled row below is a one-time migration artifact — ids use
-- gen_random_uuid() (built into Postgres 13+, no extension needed) rather
-- than cuid() purely because this runs in plain SQL, not Prisma; the id
-- column is untyped TEXT so this has no functional effect.

-- 1. Multi-format terrain pricing/capacity ----------------------------------

CREATE TYPE "FormatEquipe" AS ENUM ('quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'onze');

CREATE TABLE "TerrainFormatOffre" (
    "id" TEXT NOT NULL,
    "terrainId" TEXT NOT NULL,
    "format" "FormatEquipe" NOT NULL,
    "capacite" INTEGER NOT NULL,
    "prixParCreneau" INTEGER NOT NULL,
    CONSTRAINT "TerrainFormatOffre_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TerrainFormatOffre_terrainId_format_key" ON "TerrainFormatOffre"("terrainId", "format");
CREATE INDEX "TerrainFormatOffre_terrainId_idx" ON "TerrainFormatOffre"("terrainId");

ALTER TABLE "TerrainFormatOffre" ADD CONSTRAINT "TerrainFormatOffre_terrainId_fkey"
  FOREIGN KEY ("terrainId") REFERENCES "Terrain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one offer per existing terrain from its old scalar format/price.
-- Capacity is derived from the old format label (standard squad sizing).
INSERT INTO "TerrainFormatOffre" ("id", "terrainId", "format", "capacite", "prixParCreneau")
SELECT
  gen_random_uuid()::text,
  "id",
  "format"::text::"FormatEquipe",
  CASE "format"::text
    WHEN 'cinq' THEN 10
    WHEN 'sept' THEN 14
    WHEN 'onze' THEN 22
    ELSE 10
  END,
  "prixParCreneau"
FROM "Terrain";

ALTER TABLE "Terrain" DROP COLUMN "format";
ALTER TABLE "Terrain" DROP COLUMN "prixParCreneau";
DROP TYPE "TerrainFormat";

-- 2. Unified conversations ---------------------------------------------------

CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "estGroupe" BOOLEAN NOT NULL DEFAULT false,
    "nom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message" ADD COLUMN "conversationId" TEXT;

-- One conversation per unique unordered pair of (expediteur, destinataire)
-- that has ever exchanged a message, seeded from the existing Message rows.
CREATE TEMP TABLE "_pair_conversation" AS
SELECT
  LEAST("expediteurId", "destinataireId") AS "userA",
  GREATEST("expediteurId", "destinataireId") AS "userB",
  gen_random_uuid()::text AS "conversationId",
  MIN("createdAt") AS "createdAt"
FROM "Message"
GROUP BY LEAST("expediteurId", "destinataireId"), GREATEST("expediteurId", "destinataireId");

INSERT INTO "Conversation" ("id", "estGroupe", "createdAt")
SELECT "conversationId", false, "createdAt" FROM "_pair_conversation";

INSERT INTO "ConversationParticipant" ("id", "conversationId", "userId", "joinedAt")
SELECT gen_random_uuid()::text, "conversationId", "userA", "createdAt" FROM "_pair_conversation"
UNION ALL
SELECT gen_random_uuid()::text, "conversationId", "userB", "createdAt" FROM "_pair_conversation";

UPDATE "Message" m
SET "conversationId" = pc."conversationId"
FROM "_pair_conversation" pc
WHERE LEAST(m."expediteurId", m."destinataireId") = pc."userA"
  AND GREATEST(m."expediteurId", m."destinataireId") = pc."userB";

DROP TABLE "_pair_conversation";

ALTER TABLE "Message" ALTER COLUMN "conversationId" SET NOT NULL;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

ALTER TABLE "Message" DROP CONSTRAINT "Message_destinataireId_fkey";
DROP INDEX IF EXISTS "Message_expediteurId_destinataireId_idx";
DROP INDEX IF EXISTS "Message_destinataireId_expediteurId_idx";
ALTER TABLE "Message" DROP COLUMN "destinataireId";
CREATE INDEX "Message_expediteurId_idx" ON "Message"("expediteurId");

-- 3. Notifications ------------------------------------------------------------

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "lien" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_lu_idx" ON "Notification"("userId", "lu");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply the migration to the local test database and regenerate the client**

Run (adjust the connection string only if the project's `.env.test` uses a different one — check `.env.test` first and use its `DATABASE_URL` verbatim):

```bash
npx dotenv -e .env.test -- prisma migrate deploy
npx prisma generate
```

Expected: both commands exit 0, and `npx prisma migrate status` (same `dotenv -e .env.test` prefix) reports "Database schema is up to date".

- [ ] **Step 4: Verify the build still type-checks with the old query files (they will show errors — that's expected and Tasks 2-4 fix them)**

Run: `npx tsc --noEmit`
Expected: errors ONLY in `src/lib/terrains/queries.ts`, `src/lib/terrains/format.ts`, `src/lib/validation/terrain.ts`, `src/components/terrains/*.tsx`, `src/app/terrains/**`, `prisma/seed.ts`, `src/lib/messages/queries.ts`, `tests/lib/terrains/*`, `tests/lib/validation/terrain.test.ts`, `tests/lib/messages/*`, `tests/setup/testDb.ts` (missing `terrainFormatOffre`/`conversation`/`conversationParticipant`/`notification` model on the reset helper — expected, Task 5 handles it). If errors appear anywhere else, stop — that means the schema edit broke something unplanned.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260825120000_wave1_foundation
git commit -m "feat(schema): multi-format terrains, unified conversations, notifications"
```

---

## Task 2: Terrain query layer — multi-format types and filtering

**Files:**
- Modify: `src/lib/terrains/queries.ts`
- Modify: `src/lib/validation/terrain.ts`
- Modify: `src/lib/terrains/format.ts`
- Test: `tests/lib/terrains/queries.test.ts`
- Test: `tests/lib/terrains/format.test.ts`
- Test: `tests/lib/validation/terrain.test.ts`

**Interfaces:**
- Consumes: Prisma models from Task 1 (`FormatEquipe`, `Terrain.formats`, `TerrainFormatOffre`).
- Produces (for Task 3): `TerrainFormatResume = { format: FormatEquipe; capacite: number; prixParCreneau: number }`; `TerrainResume` gains `formats: TerrainFormatResume[]` and `prixAPartirDe: number`, loses `format`/`prixParCreneau`; `TerrainDetail` gains the same `formats`/no longer has `format`/`prixParCreneau`; `libelleFormat(format: FormatEquipe): string` (same name, new param type, 7 entries).

- [ ] **Step 1: Rewrite `src/lib/terrains/format.ts`**

```ts
import type { FormatEquipe, TerrainType } from "@prisma/client";

/** Les prix sont stockés en millimes : 1 dinar = 1000 millimes. */
export function formatPrix(millimes: number): string {
  const signe = millimes < 0 ? "-" : "";
  const abs = Math.abs(millimes);
  const dinars = Math.floor(abs / 1000);
  const reste = String(abs % 1000).padStart(3, "0");
  return `${signe}${dinars},${reste} DT`;
}

const FORMATS: Record<FormatEquipe, string> = {
  quatre: "4 contre 4",
  cinq: "5 contre 5",
  six: "6 contre 6",
  sept: "7 contre 7",
  huit: "8 contre 8",
  neuf: "9 contre 9",
  onze: "11 contre 11",
};

export function libelleFormat(format: FormatEquipe): string {
  return FORMATS[format] ?? format;
}

const TYPES: Record<TerrainType, string> = {
  gazon_synthetique: "Gazon synthétique",
  gazon_naturel: "Gazon naturel",
  beton: "Béton",
};

export function libelleType(type: TerrainType): string {
  return TYPES[type] ?? type;
}

const EQUIPEMENTS: Record<string, string> = {
  vestiaires: "Vestiaires",
  douches: "Douches",
  eclairage: "Éclairage",
  parking: "Parking",
  tribunes: "Tribunes",
  buvette: "Buvette",
};

export function libelleEquipement(equipement: string): string {
  return EQUIPEMENTS[equipement] ?? equipement;
}
```

- [ ] **Step 2: Update `tests/lib/terrains/format.test.ts`**

Read the existing file first. It tests `formatPrix`, `libelleFormat`, `libelleType`, `libelleEquipement`. Keep every `formatPrix`/`libelleType`/`libelleEquipement` test unchanged. For `libelleFormat`, keep the existing `"cinq"` → `"5 contre 5"` case (still valid — the label didn't change), and add these cases (one `it` block per line, matching the file's existing style):

```ts
expect(libelleFormat("quatre")).toBe("4 contre 4");
expect(libelleFormat("six")).toBe("6 contre 6");
expect(libelleFormat("huit")).toBe("8 contre 8");
expect(libelleFormat("neuf")).toBe("9 contre 9");
```

Run: `npm test -- tests/lib/terrains/format.test.ts`
Expected: all pass.

- [ ] **Step 3: Rewrite `src/lib/validation/terrain.ts`**

Replace only the `formatSchema` export; leave every other export (`dateSchema`, `heureSchema`, `terrainListQuerySchema`, `terrainDetailQuerySchema`, and their inferred types) exactly as-is:

```ts
export const formatSchema = z.enum(
  ["quatre", "cinq", "six", "sept", "huit", "neuf", "onze"],
  { errorMap: () => ({ message: "Format invalide" }) }
);
```

- [ ] **Step 4: Update `tests/lib/validation/terrain.test.ts`**

The existing test `"rejects an invalid format value"` uses `{ format: "neuf" }` expecting `success === false` — `"neuf"` is now a VALID format, so this test's premise is wrong. Change that one test to use a genuinely invalid value:

```ts
it("rejects an invalid format value", () => {
  const result = terrainListQuerySchema.safeParse({ format: "vingt-deux" });
  expect(result.success).toBe(false);
});
```

Every other test in the file is unaffected — leave them as-is.

Run: `npm test -- tests/lib/validation/terrain.test.ts`
Expected: all pass.

- [ ] **Step 5: Rewrite `src/lib/terrains/queries.ts`**

```ts
import type { FormatEquipe, Prisma, TerrainType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSlots, type Slot } from "@/lib/terrains/slots";
import { findTakenSlots, findTakenSlotsForTerrains } from "@/lib/reservations/queries";
import type { TerrainListQuery } from "@/lib/validation/terrain";

export type TerrainFormatResume = {
  format: FormatEquipe;
  capacite: number;
  prixParCreneau: number;
};

export type TerrainResume = {
  id: string;
  nom: string;
  ville: string;
  adresse: string;
  type: TerrainType;
  formats: TerrainFormatResume[];
  prixAPartirDe: number;
  photo: string | null;
  creneauxLibres: number;
};

export type TerrainDetail = {
  id: string;
  nom: string;
  description: string | null;
  adresse: string;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  type: TerrainType;
  formats: TerrainFormatResume[];
  dureeCreneauMinutes: number;
  equipements: string[];
  photos: string[];
  /** Jour affiché, "YYYY-MM-DD". */
  date: string;
  creneaux: Slot[];
};

/** "YYYY-MM-DD" → Date locale (minuit local, pour éviter tout aller-retour par l'UTC). */
function parseDateLocale(valeur: string): Date {
  const [annee, mois, jour] = valeur.split("-").map(Number);
  return new Date(annee, mois - 1, jour);
}

function formatDateLocale(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

function toMinutes(hhmm: string): number {
  const [heures, minutes] = hhmm.split(":").map(Number);
  return heures * 60 + minutes;
}

function toFormatResumes(
  formats: { format: FormatEquipe; capacite: number; prixParCreneau: number }[]
): TerrainFormatResume[] {
  return formats.map((f) => ({
    format: f.format,
    capacite: f.capacite,
    prixParCreneau: f.prixParCreneau,
  }));
}

function prixAPartirDe(formats: TerrainFormatResume[]): number {
  if (formats.length === 0) return 0;
  return Math.min(...formats.map((f) => f.prixParCreneau));
}

export async function findTerrains(
  query: TerrainListQuery,
  maintenant: Date = new Date()
): Promise<TerrainResume[]> {
  const where: Prisma.TerrainWhereInput = { statut: "actif" };

  if (query.ville) {
    where.ville = { equals: query.ville, mode: "insensitive" };
  }
  // Un même "offre" doit satisfaire le format ET le prix max ensemble —
  // sinon un terrain à 5v5 cher mais 11v11 pas cher passerait à tort un
  // filtre "5v5, prix max bas".
  if (query.format || query.prixMax !== undefined) {
    where.formats = {
      some: {
        ...(query.format ? { format: query.format } : {}),
        ...(query.prixMax !== undefined ? { prixParCreneau: { lte: query.prixMax } } : {}),
      },
    };
  }

  const terrains = await prisma.terrain.findMany({
    where,
    include: { horaires: true, formats: true },
    orderBy: { nom: "asc" },
    take: 100, // Sécurité : borne le coût de la requête et de la génération de
               // créneaux qui suit. Ce n'est pas une pagination — juste un
               // plafond. Une vraie pagination viendra si le catalogue dépasse
               // ce seuil.
  });

  const date = query.date ? parseDateLocale(query.date) : maintenant;
  const dateStr = formatDateLocale(date);
  const parTerrain = await findTakenSlotsForTerrains(terrains.map((t) => t.id), dateStr);

  const resumes = terrains.map((terrain) => {
    const creneaux = generateSlots({
      horaires: terrain.horaires,
      date,
      dureeCreneauMinutes: terrain.dureeCreneauMinutes,
      taken: parTerrain.get(terrain.id) ?? [],
      maintenant,
    });
    const formats = toFormatResumes(terrain.formats);

    return {
      terrain,
      creneaux,
      resume: {
        id: terrain.id,
        nom: terrain.nom,
        ville: terrain.ville,
        adresse: terrain.adresse,
        type: terrain.type,
        formats,
        prixAPartirDe: prixAPartirDe(formats),
        photo: terrain.photos[0] ?? null,
        creneauxLibres: creneaux.filter((c) => c.disponible).length,
      },
    };
  });

  // Le filtre par heure demande de connaître les créneaux : il s'applique
  // après génération, en mémoire.
  const filtres = query.heure
    ? resumes.filter(({ creneaux }) => {
        const h = toMinutes(query.heure!);
        return creneaux.some(
          (c) => c.disponible && toMinutes(c.debut) <= h && h < toMinutes(c.fin)
        );
      })
    : resumes;

  return filtres.map(({ resume }) => resume);
}

export async function findTerrainById(
  id: string,
  date?: string,
  maintenant: Date = new Date()
): Promise<TerrainDetail | null> {
  const terrain = await prisma.terrain.findFirst({
    where: { id, statut: "actif" },
    include: { horaires: true, formats: true },
  });

  if (!terrain) return null;

  const jour = date ? parseDateLocale(date) : maintenant;
  const jourStr = formatDateLocale(jour);
  const taken = await findTakenSlots(id, jourStr);

  return {
    id: terrain.id,
    nom: terrain.nom,
    description: terrain.description,
    adresse: terrain.adresse,
    ville: terrain.ville,
    latitude: terrain.latitude,
    longitude: terrain.longitude,
    type: terrain.type,
    formats: toFormatResumes(terrain.formats),
    dureeCreneauMinutes: terrain.dureeCreneauMinutes,
    equipements: terrain.equipements,
    photos: terrain.photos,
    date: jourStr,
    creneaux: generateSlots({
      horaires: terrain.horaires,
      date: jour,
      dureeCreneauMinutes: terrain.dureeCreneauMinutes,
      taken,
      maintenant,
    }),
  };
}
```

- [ ] **Step 6: Update `tests/lib/terrains/queries.test.ts`**

Read the existing file first — it creates `Terrain` fixtures via `prisma.terrain.create({ data: { ..., format: "cinq", prixParCreneau: 60000, ... } })` and asserts on `.format`/`.prixParCreneau` in the returned resumes/details. Apply this transformation throughout the file:

Every fixture creation like:
```ts
await prisma.terrain.create({
  data: {
    nom: "...", ville: "...", adresse: "...", type: "gazon_synthetique",
    format: "cinq", prixParCreneau: 60000, dureeCreneauMinutes: 90,
    horaires: { create: [...] },
  },
});
```
becomes:
```ts
await prisma.terrain.create({
  data: {
    nom: "...", ville: "...", adresse: "...", type: "gazon_synthetique",
    dureeCreneauMinutes: 90,
    formats: { create: [{ format: "cinq", capacite: 10, prixParCreneau: 60000 }] },
    horaires: { create: [...] },
  },
});
```
(keep every other field — `nom`, `ville`, `adresse`, `type`, `dureeCreneauMinutes`, `horaires`, `equipements`, `photos`, etc. — exactly as the original test had them; only `format`/`prixParCreneau` move into `formats: { create: [...] }`).

Every assertion like `expect(resume.format).toBe("cinq")` becomes `expect(resume.formats).toEqual([{ format: "cinq", capacite: 10, prixParCreneau: 60000 }])`, and every assertion like `expect(resume.prixParCreneau).toBe(60000)` becomes `expect(resume.prixAPartirDe).toBe(60000)`.

Add one new test case to the `findTerrains` describe block proving multi-format AND-filtering works correctly:

```ts
it("filters by format AND prixMax together against the same offer, not either alone", async () => {
  const terrain = await prisma.terrain.create({
    data: {
      nom: "Multi-Format Arena", ville: "Tunis", adresse: "1 Rue Test",
      type: "gazon_synthetique", dureeCreneauMinutes: 90,
      formats: {
        create: [
          { format: "cinq", capacite: 10, prixParCreneau: 100000 },
          { format: "onze", capacite: 22, prixParCreneau: 30000 },
        ],
      },
      horaires: { create: [{ jourSemaine: 1, ouvre: "08:00", ferme: "22:00" }] },
    },
  });

  // cinq is expensive (100000), onze is cheap (30000) — a filter for
  // "cinq AND prixMax 50000" must match NEITHER offer, not fall back to
  // matching the cheap onze offer.
  const resultats = await findTerrains(
    { format: "cinq", prixMax: 50000 },
    new Date(2026, 0, 5) // a Monday
  );
  expect(resultats.find((r) => r.id === terrain.id)).toBeUndefined();

  const resultatsOnze = await findTerrains(
    { format: "onze", prixMax: 50000 },
    new Date(2026, 0, 5)
  );
  expect(resultatsOnze.find((r) => r.id === terrain.id)).toBeDefined();
});
```

Run: `npm test -- tests/lib/terrains/queries.test.ts`
Expected: all pass.

- [ ] **Step 7: Full local check**

Run: `npm test && npm run lint`
Expected: all pass, no new lint errors, in files this task touched.

- [ ] **Step 8: Commit**

```bash
git add src/lib/terrains/queries.ts src/lib/terrains/format.ts src/lib/validation/terrain.ts tests/lib/terrains/queries.test.ts tests/lib/terrains/format.test.ts tests/lib/validation/terrain.test.ts
git commit -m "feat(terrains): multi-format pricing and filtering"
```

---

## Task 3: Terrain UI consumers and seed data

**Files:**
- Modify: `src/components/terrains/TerrainCard.tsx`
- Modify: `src/components/terrains/TerrainFiltres.tsx`
- Modify: `src/app/terrains/[id]/page.tsx`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: `TerrainResume`, `TerrainDetail`, `TerrainFormatResume`, `libelleFormat(FormatEquipe)`, `formatPrix` from Task 2 (already merged before this task starts, per plan ordering below).

- [ ] **Step 1: Rewrite `src/components/terrains/TerrainCard.tsx`**

```tsx
import Link from "next/link";
import type { TerrainResume } from "@/lib/terrains/queries";
import { formatPrix, libelleFormat, libelleType } from "@/lib/terrains/format";
import { TerrainIllustration } from "@/components/ui/TerrainIllustration";

function libelleCreneaux(nombre: number): string {
  if (nombre === 0) return "Aucun créneau libre";
  if (nombre === 1) return "1 créneau libre";
  return `${nombre} créneaux libres`;
}

export function TerrainCard({ terrain }: { terrain: TerrainResume }) {
  return (
    <Link
      href={`/terrains/${terrain.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div className="relative">
        {terrain.photo ? (
          <img
            src={terrain.photo}
            alt={terrain.nom}
            className="mb-3 h-32 w-full rounded-lg object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <TerrainIllustration className="mb-3 h-32 w-full rounded-lg object-cover" />
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-3 py-1 text-xs font-bold ${
            terrain.creneauxLibres > 0
              ? "bg-accent text-anthracite"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {terrain.creneauxLibres > 0 ? "⚡ " : ""}
          {libelleCreneaux(terrain.creneauxLibres)}
        </span>
      </div>

      <h2 className="font-semibold text-anthracite">{terrain.nom}</h2>

      <p className="mt-1 text-sm text-gray-600">
        {terrain.ville} · {terrain.adresse}
      </p>

      <p className="mt-1 text-sm text-gray-600">
        {terrain.formats.map((f) => libelleFormat(f.format)).join(" · ")} · {libelleType(terrain.type)}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold text-primary">
          À partir de {formatPrix(terrain.prixAPartirDe)}
        </span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Edit `src/components/terrains/TerrainFiltres.tsx`**

In the `<select id="format" ...>` block, replace the three `<option>` lines:
```tsx
<option value="">Tous</option>
<option value="cinq">5 contre 5</option>
<option value="sept">7 contre 7</option>
<option value="onze">11 contre 11</option>
```
with:
```tsx
<option value="">Tous</option>
<option value="quatre">4 contre 4</option>
<option value="cinq">5 contre 5</option>
<option value="six">6 contre 6</option>
<option value="sept">7 contre 7</option>
<option value="huit">8 contre 8</option>
<option value="neuf">9 contre 9</option>
<option value="onze">11 contre 11</option>
```
Nothing else in this file changes.

- [ ] **Step 3: Edit `src/app/terrains/[id]/page.tsx`**

Replace the `generateMetadata` function body:
```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const terrain = await getTerrain(id);
  if (!terrain) return { title: "Terrain introuvable" };
  return {
    title: `${terrain.nom} — ${terrain.ville}`,
    description: `${libelleFormat(terrain.format)} à ${terrain.ville}. ${formatPrix(terrain.prixParCreneau)} le créneau.`,
  };
}
```
with:
```tsx
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const terrain = await getTerrain(id);
  if (!terrain) return { title: "Terrain introuvable" };
  const formats = terrain.formats.map((f) => libelleFormat(f.format)).join(", ");
  const prixMin = Math.min(...terrain.formats.map((f) => f.prixParCreneau));
  return {
    title: `${terrain.nom} — ${terrain.ville}`,
    description: `${formats} à ${terrain.ville}. À partir de ${formatPrix(prixMin)} le créneau.`,
  };
}
```

Replace the `<dl className="mt-4 grid grid-cols-2 gap-3 text-sm">...</dl>` block (the one with Format/Surface/Tarif/Durée) with:
```tsx
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-600">Surface</dt>
              <dd className="font-medium text-anthracite">{libelleType(terrain.type)}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Durée</dt>
              <dd className="font-medium text-anthracite">{terrain.dureeCreneauMinutes} minutes</dd>
            </div>
          </dl>

          <section className="mt-4">
            <h2 className="text-sm font-semibold text-anthracite">Formats disponibles</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {terrain.formats.map((f) => (
                <li
                  key={f.format}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <span className="text-anthracite">
                    {libelleFormat(f.format)} · {f.capacite} joueurs max
                  </span>
                  <span className="font-semibold text-primary">{formatPrix(f.prixParCreneau)}</span>
                </li>
              ))}
            </ul>
          </section>
```
Nothing else in this file changes (the equipements section, the créneaux section, and all imports stay as-is — `libelleFormat` is already imported).

- [ ] **Step 4: Edit `prisma/seed.ts`**

Replace the `TERRAINS` array's per-entry `format`/`prixParCreneau` fields with a `formats` array, and update `seedTerrains` to create them. Replace the whole file's `TERRAINS` constant and `seedTerrains` function with:

```ts
const TERRAINS = [
  {
    nom: "Complexe El Menzah",
    description:
      "Terrain de proximité au cœur d'El Menzah, éclairé et accessible en soirée.",
    adresse: "Rue de Rome, El Menzah",
    ville: "Tunis",
    latitude: 36.8382,
    longitude: 10.1712,
    type: "gazon_synthetique" as const,
    dureeCreneauMinutes: 90,
    equipements: ["vestiaires", "douches", "eclairage", "parking"],
    horaires: horaires(TOUS_LES_JOURS, "08:00", "23:00"),
    formats: [
      { format: "cinq" as const, capacite: 10, prixParCreneau: 60000 },
      { format: "sept" as const, capacite: 14, prixParCreneau: 80000 },
    ],
  },
  {
    nom: "Stade Municipal d'Ariana",
    description: "Grand terrain en gazon naturel, idéal pour les matchs à 11.",
    adresse: "Avenue Habib Bourguiba, Ariana",
    ville: "Ariana",
    latitude: 36.8625,
    longitude: 10.1956,
    type: "gazon_naturel" as const,
    dureeCreneauMinutes: 90,
    equipements: ["vestiaires", "douches", "tribunes"],
    // Fermé le vendredi — exerce la règle « aucun horaire = terrain fermé ».
    horaires: horaires(SAUF_VENDREDI, "09:00", "21:00"),
    formats: [{ format: "onze" as const, capacite: 22, prixParCreneau: 120000 }],
  },
  {
    nom: "Sfax Foot Center",
    description: "Deux terrains synthétiques couverts, ouverts toute l'année.",
    adresse: "Route de Gremda km 3",
    ville: "Sfax",
    latitude: 34.7714,
    longitude: 10.7605,
    type: "gazon_synthetique" as const,
    dureeCreneauMinutes: 60,
    equipements: ["vestiaires", "eclairage", "buvette"],
    horaires: horaires(TOUS_LES_JOURS, "10:00", "23:00"),
    formats: [{ format: "sept" as const, capacite: 14, prixParCreneau: 80000 }],
  },
  {
    nom: "Sousse Beach Arena",
    description: "Terrain en béton en bord de mer, tarif accessible.",
    adresse: "Boulevard de la Corniche",
    ville: "Sousse",
    latitude: 35.8256,
    longitude: 10.6369,
    type: "beton" as const,
    dureeCreneauMinutes: 60,
    equipements: ["eclairage"],
    horaires: [
      // Horaires coupés : matin puis soirée.
      ...horaires(TOUS_LES_JOURS, "08:00", "12:00"),
      ...horaires(TOUS_LES_JOURS, "16:00", "22:00"),
    ],
    formats: [{ format: "cinq" as const, capacite: 10, prixParCreneau: 40000 }],
  },
];

/**
 * Insère les terrains de démonstration. Idempotent : un terrain déjà présent
 * (même nom, même ville) est ignoré, pour que le script puisse être relancé.
 */
export async function seedTerrains(client: Client): Promise<void> {
  for (const { horaires: h, formats, ...terrain } of TERRAINS) {
    const existant = await client.terrain.findFirst({
      where: { nom: terrain.nom, ville: terrain.ville },
      select: { id: true },
    });

    if (existant) continue;

    await client.terrain.create({
      data: {
        ...terrain,
        photos: [],
        horaires: { create: h },
        formats: { create: formats },
      },
    });
  }
}
```
(Leave every other part of `prisma/seed.ts` — imports, `TOUS_LES_JOURS`, `SAUF_VENDREDI`, `horaires()`, `main()`, `estExecuteDirectement()` — exactly as-is.)

- [ ] **Step 5: Manual verification**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: `npm test` all pass (terrain-list-page tests, if any, exercise `TerrainCard`/`TerrainFiltres` through existing component tests — check `tests/components/` for a `TerrainCard`/`TerrainFiltres` test file and update it the same way Task 2 Step 6 updated fixtures, if one exists and references `.format`/`.prixParCreneau`). `tsc --noEmit` shows zero errors in every file this task and Task 2 touched. `npm run lint` clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/terrains/TerrainCard.tsx src/components/terrains/TerrainFiltres.tsx src/app/terrains/[id]/page.tsx prisma/seed.ts tests
git commit -m "feat(terrains): multi-format UI and seed data"
```

---

## Task 4: Unified conversations, notifications module, and wiring

**Files:**
- Modify: `src/lib/messages/queries.ts`
- Create: `src/lib/notifications/queries.ts`
- Modify: `src/lib/amis/queries.ts`
- Test: `tests/lib/messages/queries.test.ts` (or wherever the existing messages query tests live — search `tests/lib/messages`)
- Test: `tests/api/messages.test.ts`
- Test: `tests/lib/amis/queries.test.ts` (search `tests/lib/amis` for the exact filename)
- Create: `tests/lib/notifications/queries.test.ts`

**Interfaces:**
- Consumes: Prisma models from Task 1 (`Conversation`, `ConversationParticipant`, `Message.conversationId`, `Notification`).
- Produces: `envoyerMessage`, `findConversation`, `findConversations`, `MessageResume`, `ConversationResume`, `EnvoyerMessageResultat` — **unchanged public shape**, so `src/app/api/messages/[userId]/route.ts`, `src/app/amis/page.tsx`, `src/app/amis/[id]/page.tsx`, `src/components/messages/ConversationThread.tsx`, `src/components/matchs/InviterAmiButton.tsx` need NO changes and are NOT part of this task's file list. `creerNotification(input: { userId: string; type: NotificationType; contenu: string; lien?: string }): Promise<void>`, `findNotifications(userId): Promise<NotificationResume[]>`, `countNotificationsNonLues(userId): Promise<number>`, `marquerCommeLue(notificationId, userId): Promise<{ ok: boolean }>`, `marquerToutesCommeLues(userId): Promise<void>`.

- [ ] **Step 1: Rewrite `src/lib/messages/queries.ts`**

```ts
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sontAmis } from "@/lib/amis/queries";
import { creerNotification } from "@/lib/notifications/queries";

export type MessageResume = {
  id: string;
  expediteurId: string;
  contenu: string;
  createdAt: Date;
};

export type ConversationResume = {
  autreUserId: string;
  autrePrenom: string;
  dernierMessage: string;
  dernierMessageAt: Date;
};

export type EnvoyerMessageResultat =
  | { ok: true; id: string }
  | { ok: false; raison: "pas_amis" };

/**
 * Retrouve la conversation 1:1 entre deux utilisateurs, ou la crée. Course
 * connue et acceptée : deux premiers messages envoyés au même instant entre
 * deux utilisateurs qui ne se sont encore jamais écrit peuvent, en théorie,
 * créer deux conversations distinctes au lieu d'une — cas rare (il faut que
 * ce soit littéralement leur tout premier échange) et sans conséquence pire
 * qu'un historique swindé en deux fils ; pas de verrou supplémentaire pour
 * ça ici.
 */
async function trouverOuCreerConversation1a1(
  tx: Prisma.TransactionClient,
  userIdA: string,
  userIdB: string
): Promise<string> {
  const existante = await tx.conversation.findFirst({
    where: {
      estGroupe: false,
      AND: [
        { participants: { some: { userId: userIdA } } },
        { participants: { some: { userId: userIdB } } },
      ],
    },
    select: { id: true },
  });
  if (existante) return existante.id;

  const creee = await tx.conversation.create({
    data: {
      estGroupe: false,
      participants: { create: [{ userId: userIdA }, { userId: userIdB }] },
    },
  });
  return creee.id;
}

/**
 * L'amitié est vérifiée à l'écriture, pas seulement à l'affichage du bouton
 * côté client — un utilisateur ne peut pas contourner l'exigence en
 * appelant directement l'API.
 */
export async function envoyerMessage(
  expediteurId: string,
  destinataireId: string,
  contenu: string
): Promise<EnvoyerMessageResultat> {
  if (!(await sontAmis(expediteurId, destinataireId))) {
    return { ok: false, raison: "pas_amis" };
  }

  const message = await prisma.$transaction(async (tx) => {
    const conversationId = await trouverOuCreerConversation1a1(tx, expediteurId, destinataireId);
    return tx.message.create({ data: { conversationId, expediteurId, contenu } });
  });

  await creerNotification({
    userId: destinataireId,
    type: "message",
    contenu: "Vous avez reçu un nouveau message.",
    lien: `/amis/${expediteurId}`,
  });

  return { ok: true, id: message.id };
}

export async function findConversation(
  userIdA: string,
  userIdB: string
): Promise<MessageResume[]> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      estGroupe: false,
      AND: [
        { participants: { some: { userId: userIdA } } },
        { participants: { some: { userId: userIdB } } },
      ],
    },
    select: { id: true },
  });
  if (!conversation) return [];

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return messages.map((m) => ({
    id: m.id,
    expediteurId: m.expediteurId,
    contenu: m.contenu,
    createdAt: m.createdAt,
  }));
}

/**
 * Une conversation 1:1 par interlocuteur distinct. S'appuie sur le modèle
 * Conversation (voir trouverOuCreerConversation1a1) plutôt que de réduire
 * les messages en mémoire comme avant — le modèle porte maintenant aussi
 * les conversations de groupe (hors périmètre ici, estGroupe: true).
 */
export async function findConversations(userId: string): Promise<ConversationResume[]> {
  const conversations = await prisma.conversation.findMany({
    where: { estGroupe: false, participants: { some: { userId } } },
    include: {
      participants: {
        include: { user: { select: { profile: { select: { prenom: true } } } } },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const resumes: ConversationResume[] = [];
  for (const conv of conversations) {
    const dernier = conv.messages[0];
    if (!dernier) continue; // pas encore de message échangé dans cette conversation
    const autre = conv.participants.find((p) => p.userId !== userId);
    if (!autre) continue;
    resumes.push({
      autreUserId: autre.userId,
      autrePrenom: autre.user.profile?.prenom ?? "Joueur",
      dernierMessage: dernier.contenu,
      dernierMessageAt: dernier.createdAt,
    });
  }

  resumes.sort((a, b) => b.dernierMessageAt.getTime() - a.dernierMessageAt.getTime());
  return resumes;
}
```

- [ ] **Step 2: Create `src/lib/notifications/queries.ts`**

```ts
import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "demande_ami"
  | "message"
  | "invitation_match"
  | "rappel_match";

export type NotificationResume = {
  id: string;
  type: string;
  contenu: string;
  lien: string | null;
  lu: boolean;
  createdAt: Date;
};

export async function creerNotification(input: {
  userId: string;
  type: NotificationType;
  contenu: string;
  lien?: string;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      contenu: input.contenu,
      lien: input.lien,
    },
  });
}

export async function findNotifications(userId: string): Promise<NotificationResume[]> {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return notifications;
}

export async function countNotificationsNonLues(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, lu: false } });
}

export async function marquerCommeLue(
  notificationId: string,
  userId: string
): Promise<{ ok: boolean }> {
  // updateMany avec userId dans le where (pas juste l'id) : un utilisateur
  // ne peut marquer comme lue que SA PROPRE notification.
  const resultat = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { lu: true },
  });
  return { ok: resultat.count > 0 };
}

export async function marquerToutesCommeLues(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, lu: false },
    data: { lu: true },
  });
}
```

- [ ] **Step 3: Create `tests/lib/notifications/queries.test.ts`**

First, check how other query test files set up a test user (look at `tests/lib/amis/queries.test.ts` or `tests/lib/matchs/queries.test.ts` for the exact `prisma.user.create(...)` fixture shape used — `email`, `passwordHash`, and a nested `profile.create` with `prenom`/`ville` are required fields per `prisma/schema.prisma`; reuse that same fixture-creation helper/pattern verbatim rather than inventing a new one). Then write:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import {
  creerNotification,
  findNotifications,
  countNotificationsNonLues,
  marquerCommeLue,
  marquerToutesCommeLues,
} from "@/lib/notifications/queries";

async function creerUtilisateur(email: string, prenom: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: "hash",
      profile: { create: { prenom, ville: "Tunis" } },
    },
  });
}

describe("notifications/queries", () => {
  beforeEach(resetDb);

  it("creerNotification then findNotifications returns it, newest first", async () => {
    const user = await creerUtilisateur("u1@test.com", "Amine");
    await creerNotification({ userId: user.id, type: "message", contenu: "Premier" });
    await creerNotification({ userId: user.id, type: "message", contenu: "Second" });

    const notifications = await findNotifications(user.id);
    expect(notifications).toHaveLength(2);
    expect(notifications[0].contenu).toBe("Second");
    expect(notifications[0].lu).toBe(false);
  });

  it("countNotificationsNonLues counts only unread notifications for that user", async () => {
    const user = await creerUtilisateur("u1@test.com", "Amine");
    const autre = await creerUtilisateur("u2@test.com", "Sami");
    await creerNotification({ userId: user.id, type: "message", contenu: "A" });
    await creerNotification({ userId: user.id, type: "message", contenu: "B" });
    await creerNotification({ userId: autre.id, type: "message", contenu: "C" });

    expect(await countNotificationsNonLues(user.id)).toBe(2);
    expect(await countNotificationsNonLues(autre.id)).toBe(1);
  });

  it("marquerCommeLue marks only the target notification and only for its owner", async () => {
    const user = await creerUtilisateur("u1@test.com", "Amine");
    const autre = await creerUtilisateur("u2@test.com", "Sami");
    await creerNotification({ userId: user.id, type: "message", contenu: "A" });
    const notifications = await findNotifications(user.id);
    const cible = notifications[0];

    const resultatAutre = await marquerCommeLue(cible.id, autre.id);
    expect(resultatAutre.ok).toBe(false);

    const resultat = await marquerCommeLue(cible.id, user.id);
    expect(resultat.ok).toBe(true);
    expect(await countNotificationsNonLues(user.id)).toBe(0);
  });

  it("marquerToutesCommeLues clears the unread count", async () => {
    const user = await creerUtilisateur("u1@test.com", "Amine");
    await creerNotification({ userId: user.id, type: "message", contenu: "A" });
    await creerNotification({ userId: user.id, type: "message", contenu: "B" });

    await marquerToutesCommeLues(user.id);
    expect(await countNotificationsNonLues(user.id)).toBe(0);
  });
});
```

Run: `npm test -- tests/lib/notifications/queries.test.ts`
Expected: all pass. If the fixture-creation pattern you copied from an existing test file differs from `creerUtilisateur` above (different required fields), adjust `creerUtilisateur` to match what that file actually does — the point is consistency with the codebase's existing test fixtures, not this exact snippet.

- [ ] **Step 4: Update the existing messages query tests**

Find the test file (search `tests/lib/messages/` — likely `queries.test.ts`). Read it fully first. It will construct fixtures via `prisma.message.create({ data: { expediteurId, destinataireId, contenu } })` directly, bypassing `envoyerMessage`. Since `Message` no longer has `destinataireId`, every such direct fixture must instead go through a conversation. Add this helper at the top of the test file (near its existing imports) and use it wherever a test previously did a raw `prisma.message.create` with `destinataireId`:

```ts
async function creerMessageDirect(
  expediteurId: string,
  destinataireId: string,
  contenu: string,
  createdAt?: Date
) {
  let conversation = await prisma.conversation.findFirst({
    where: {
      estGroupe: false,
      AND: [
        { participants: { some: { userId: expediteurId } } },
        { participants: { some: { userId: destinataireId } } },
      ],
    },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        estGroupe: false,
        participants: { create: [{ userId: expediteurId }, { userId: destinataireId }] },
      },
    });
  }
  return prisma.message.create({
    data: {
      conversationId: conversation.id,
      expediteurId,
      contenu,
      ...(createdAt ? { createdAt } : {}),
    },
  });
}
```

Replace every `prisma.message.create({ data: { expediteurId: X, destinataireId: Y, contenu: Z } })` call in the file with `creerMessageDirect(X, Y, Z)`, and every one that also set `createdAt` with `creerMessageDirect(X, Y, Z, theDate)`. Leave every `expect(...)` assertion in the file unchanged — `MessageResume`/`ConversationResume` shapes did not change, so existing assertions on `.expediteurId`, `.contenu`, `.autreUserId`, `.autrePrenom`, `.dernierMessage`, `.dernierMessageAt` all still apply verbatim.

Run: `npm test -- tests/lib/messages`
Expected: all pass.

- [ ] **Step 5: Check `tests/api/messages.test.ts`**

Read it. If it only calls the API route handler / mocks `@/lib/messages/queries` (rather than touching Prisma directly), it needs no changes — confirm this by running it. If it constructs `Message` fixtures directly via Prisma, apply the same `creerMessageDirect` transformation as Step 4.

Run: `npm test -- tests/api/messages.test.ts`
Expected: all pass, no changes needed unless direct Prisma fixtures were found.

- [ ] **Step 6: Wire a notification into `envoyerDemande`**

In `src/lib/amis/queries.ts`, add the import at the top:
```ts
import { creerNotification } from "@/lib/notifications/queries";
```

Then in `envoyerDemande`, both success paths (the reactivated-after-refusal branch and the fresh-create branch) must notify the recipient before returning. Change:
```ts
    const amitie = await prisma.amitie.update({
      where: { id: existante.id },
      data: { demandeurId, destinataireId, statut: "en_attente", respondedAt: null },
    });
    return { ok: true, id: amitie.id };
  }

  const amitie = await prisma.amitie.create({ data: { demandeurId, destinataireId } });
  return { ok: true, id: amitie.id };
}
```
to:
```ts
    const amitie = await prisma.amitie.update({
      where: { id: existante.id },
      data: { demandeurId, destinataireId, statut: "en_attente", respondedAt: null },
    });
    await creerNotification({
      userId: destinataireId,
      type: "demande_ami",
      contenu: "Vous avez reçu une nouvelle demande d'ami.",
      lien: "/amis",
    });
    return { ok: true, id: amitie.id };
  }

  const amitie = await prisma.amitie.create({ data: { demandeurId, destinataireId } });
  await creerNotification({
    userId: destinataireId,
    type: "demande_ami",
    contenu: "Vous avez reçu une nouvelle demande d'ami.",
    lien: "/amis",
  });
  return { ok: true, id: amitie.id };
}
```

- [ ] **Step 7: Update the friend-request tests**

Find the test file covering `envoyerDemande` (search `tests/lib/amis/`). Read it. Add one assertion-bearing test case (matching that file's existing fixture style) confirming a notification is created on success:

```ts
it("creates a notification for the recipient on a successful request", async () => {
  const demandeur = await creerUtilisateur("demandeur@test.com", "Amine"); // adapt to the file's actual fixture helper name/shape
  const destinataire = await creerUtilisateur("destinataire@test.com", "Sami");

  await envoyerDemande(demandeur.id, destinataire.id);

  const notifications = await prisma.notification.findMany({ where: { userId: destinataire.id } });
  expect(notifications).toHaveLength(1);
  expect(notifications[0].type).toBe("demande_ami");
});
```

Adjust the fixture-creation calls to whatever helper/pattern the file already uses (do not introduce a second, differently-shaped user-creation helper into the same file).

Run: `npm test -- tests/lib/amis`
Expected: all pass.

- [ ] **Step 8: Full local check**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: all pass, zero errors anywhere except `tests/setup/testDb.ts` (Task 5 fixes it) and anything already expected-broken from Task 1 Step 4 that Task 2/3 haven't landed yet if this task is run in parallel with them — if Task 2/3 have already merged by the time you run this, `tsc --noEmit` should show ONLY `tests/setup/testDb.ts` errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/messages/queries.ts src/lib/notifications/queries.ts src/lib/amis/queries.ts tests/lib/messages tests/api/messages.test.ts tests/lib/amis tests/lib/notifications
git commit -m "feat(messages): unify conversations model, add notifications with wiring"
```

---

## Task 5: Reconcile `tests/setup/testDb.ts` and final full-suite verification

This task runs on `main` after Tasks 2, 3, and 4 have all merged (Task 1 must merge first, standalone; Tasks 2+3 and Task 4 may run in parallel worktrees since they touch disjoint files, per this plan's ordering note below).

**Files:**
- Modify: `tests/setup/testDb.ts`

- [ ] **Step 1: Add the three new models' cleanup to `resetDb()`**

Current file deletes in this order: `message`, `amitie`, `matchParticipant`, `match`, `reservation`, `passwordResetToken`, `playerProfile`, `terrainHoraire`, `terrain`, `user`. Insert the new models so every FK is deleted before what it points to. Replace the whole body with:

```ts
export async function resetDb() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetDb() can only run with NODE_ENV=test");
  }

  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.amitie.deleteMany();
  await prisma.matchParticipant.deleteMany();
  await prisma.match.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.terrainFormatOffre.deleteMany();
  await prisma.terrainHoraire.deleteMany();
  await prisma.terrain.deleteMany();
  await prisma.user.deleteMany();
}
```

- [ ] **Step 2: Full suite, three consecutive clean runs**

Run `npm test` three times in a row (sequentially, not in parallel — this project's shared test-database gotcha means only sequential runs are a reliable signal; see `src/lib/prisma.ts` / `vitest.config.ts` for why). Expected: exit code 0 all three times, same pass count each time (no flaky failures introduced).

Then run `npx tsc --noEmit && npm run lint && npm run build`.
Expected: all pass with zero errors.

- [ ] **Step 3: Commit**

```bash
git add tests/setup/testDb.ts
git commit -m "chore(tests): clean up conversations/notifications/terrain-formats in resetDb"
```

---

## Execution Order Note (for the controller, not a task)

Task 1 is a hard prerequisite for everything else — dispatch and merge it alone first. Tasks 2+3 (terrain files) and Task 4 (message/notification/amis files) touch disjoint file sets and may be dispatched to two parallel worktrees once Task 1 is merged to the integration branch both worktrees fork from. Task 5 requires all of 1-4 merged first, since `resetDb()` needs every new model to exist and both parallel branches to already be combined.
