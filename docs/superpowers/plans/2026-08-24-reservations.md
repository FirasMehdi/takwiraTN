# Réservations — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un joueur connecté peut réserver un créneau libre (avec anti-double-réservation garanti même sous concurrence réelle) et annuler une réservation à venir jusqu'à 24h avant.

**Architecture:** Nouveau modèle `Reservation`, protégé contre la double-réservation par un index unique partiel PostgreSQL (`WHERE statut = 'confirmee'`) écrit à la main dans la migration générée par Prisma — la même technique déjà utilisée deux fois dans ce projet. La couture prévue au sous-projet Terrains (`generateSlots({ taken })`) passe de `[]` à des données réelles. Le sélecteur de créneaux devient un composant client avec une étape de confirmation ; après réservation ou annulation, `router.refresh()` de Next.js re-déclenche le fetch serveur — pas de nouvelle dépendance de gestion d'état.

Les Tasks 1 et 2 (couche données + API) sont **strictement séquentielles** : Task 2 dépend du code de Task 1. Les Tasks 3 et 4 (deux surfaces UI indépendantes, aucun fichier en commun) ne dépendent que de Task 2 et sont exécutables en parallèle l'une de l'autre.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Prisma/PostgreSQL, next-auth (session JWT existante), Tailwind, Vitest/React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-23-reservations-design.md`

## Global Constraints

- Aucun paiement en ligne — une réservation est un engagement, pas une transaction.
- Annulation possible jusqu'à **24h avant** le début du créneau, pas moins.
- La recherche/consultation des terrains reste publique ; réserver et annuler exigent une session (`getServerSession`).
- Clic sur un créneau libre alors que non connecté → redirection vers `/connexion?callbackUrl=...`, jamais un blocage silencieux.
- Aucune vue propriétaire dans ce sous-projet.
- Copie en français, mobile-first.
- `npm test`, `npm run lint`, `npm run build` verts après chaque tâche.
- Commit après chaque tâche.

---

### Task 1: Modèle de données & requêtes réservations

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_reservations/migration.sql` (généré par Prisma, puis étendu à la main — voir Step 2)
- Modify: `tests/setup/testDb.ts`
- Create: `src/lib/reservations/queries.ts`
- Test: `tests/lib/reservations/queries.test.ts`

**Interfaces:**
- Produces: `findTakenSlots(terrainId: string, date: string): Promise<string[]>`, `findTakenSlotsForTerrains(terrainIds: string[], date: string): Promise<Map<string, string[]>>`, `creerReservation(input: CreerReservationInput): Promise<CreerReservationResultat>`, `annulerReservation(id: string, userId: string, maintenant?: Date): Promise<AnnulerReservationResultat>`, `findReservationsForUser(userId: string, maintenant?: Date): Promise<ReservationAnnulable[]>` — toutes exportées de `src/lib/reservations/queries.ts`, consommées par Task 2, 3, 4.

- [ ] **Step 1: Ajouter le modèle `Reservation` à `prisma/schema.prisma`**

Ajouter, après le modèle `TerrainHoraire` (fin de fichier) :

```prisma
enum ReservationStatut {
  confirmee
  annulee
}

model Reservation {
  id        String  @id @default(cuid())
  terrainId String
  terrain   Terrain @relation(fields: [terrainId], references: [id], onDelete: Cascade)
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  /// "YYYY-MM-DD", heure locale Africa/Tunis — même convention que Terrain/slots.
  date String
  /// "HH:MM" — doit correspondre exactement à un Slot.debut généré pour ce
  /// terrain à cette date.
  heureDebut String
  heureFin   String

  statut ReservationStatut @default(confirmee)

  createdAt  DateTime  @default(now())
  canceledAt DateTime?

  @@index([userId])
  @@index([terrainId, date])
}
```

Ajouter la relation inverse au modèle `Terrain` (juste après le champ `horaires TerrainHoraire[]`) :

```prisma
  reservations Reservation[]
```

Ajouter la relation inverse au modèle `User` (juste après `terrains Terrain[]`) :

```prisma
  reservations Reservation[]
```

- [ ] **Step 2: Générer la migration en mode `--create-only`, l'étendre à la main, puis l'appliquer**

Run: `npx prisma migrate dev --name add_reservations --create-only`

Cela crée `prisma/migrations/<timestamp>_add_reservations/migration.sql` **sans l'appliquer**. Ouvrir ce fichier et ajouter à la fin, après le SQL généré par Prisma :

```sql
-- Un index unique partiel : l'unicité ne porte que sur les réservations
-- actives, pour qu'un créneau annulé redevienne réservable par quelqu'un
-- d'autre. Prisma ne peut pas exprimer un index partiel dans le schéma —
-- cette ligne est écrite à la main, comme les migrations Terrain et
-- sessionVersion avant elle. C'est la garantie de dernier recours contre
-- une course entre deux requêtes simultanées sur le même créneau.
CREATE UNIQUE INDEX "Reservation_slot_actif_key"
  ON "Reservation" ("terrainId", "date", "heureDebut")
  WHERE "statut" = 'confirmee';
```

Puis appliquer la migration complète (générée + extension manuelle) :

Run: `npx prisma migrate dev`
Expected: la migration `add_reservations` s'applique sans erreur ; le client Prisma est régénéré avec le nouveau modèle `Reservation` et l'enum `ReservationStatut`.

Appliquer la même migration à la base de test :

Run: `npm run db:migrate:test`
Expected: succès.

- [ ] **Step 3: Mettre à jour `resetDb()` dans `tests/setup/testDb.ts`**

`Reservation` référence `Terrain` et `User` — sa suppression doit précéder celle des deux. Remplacer le contenu du fichier par :

```ts
import { prisma } from "@/lib/prisma";

export async function resetDb() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("resetDb() can only run with NODE_ENV=test");
  }

  await prisma.reservation.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.playerProfile.deleteMany();
  await prisma.terrainHoraire.deleteMany();
  await prisma.terrain.deleteMany();
  await prisma.user.deleteMany();
}
```

- [ ] **Step 4: Écrire le test de concurrence en premier (TDD — il doit échouer avant l'implémentation)**

Créer `tests/lib/reservations/queries.test.ts` :

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  creerReservation,
  annulerReservation,
  findReservationsForUser,
  findTakenSlots,
} from "@/lib/reservations/queries";

async function creerTerrain() {
  return prisma.terrain.create({
    data: {
      nom: "Terrain Test",
      adresse: "Adresse",
      ville: "Tunis",
      type: "gazon_synthetique",
      format: "cinq",
      prixParCreneau: 50000,
      horaires: { create: [{ jourSemaine: 1, ouvre: "08:00", ferme: "20:00" }] },
    },
  });
}

async function creerUtilisateur(email: string) {
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword("motdepasse123") },
  });
}

describe("reservations/queries", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a reservation and it shows up as taken", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");

    const resultat = await creerReservation({
      terrainId: terrain.id,
      userId: user.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
    });

    expect(resultat.ok).toBe(true);
    const pris = await findTakenSlots(terrain.id, "2026-09-07");
    expect(pris).toEqual(["18:00"]);
  });

  it("rejects a second reservation on the same slot", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    await creerReservation({
      terrainId: terrain.id, userId: userA.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    const resultat = await creerReservation({
      terrainId: terrain.id, userId: userB.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });

    expect(resultat).toEqual({ ok: false, raison: "conflit" });
  });

  it("allows exactly one of two truly concurrent reservations on the same slot", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    const [resultatA, resultatB] = await Promise.all([
      creerReservation({ terrainId: terrain.id, userId: userA.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30" }),
      creerReservation({ terrainId: terrain.id, userId: userB.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30" }),
    ]);

    const succes = [resultatA, resultatB].filter((r) => r.ok);
    const echecs = [resultatA, resultatB].filter((r) => !r.ok);
    expect(succes).toHaveLength(1);
    expect(echecs).toHaveLength(1);

    const enBase = await prisma.reservation.count({
      where: { terrainId: terrain.id, date: "2026-09-07", heureDebut: "18:00", statut: "confirmee" },
    });
    expect(enBase).toBe(1);
  });

  it("allows re-booking a slot after cancellation", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    const premiere = await creerReservation({
      terrainId: terrain.id, userId: userA.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    if (!premiere.ok) throw new Error("setup failed");

    // "Maintenant" très en amont du créneau, donc annulable.
    const annulation = await annulerReservation(premiere.id, userA.id, new Date(2026, 8, 1));
    expect(annulation).toEqual({ ok: true });

    const resultat = await creerReservation({
      terrainId: terrain.id, userId: userB.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    expect(resultat.ok).toBe(true);
  });

  it("refuses to cancel less than 24h before the slot", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    const reservation = await creerReservation({
      terrainId: terrain.id, userId: user.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    if (!reservation.ok) throw new Error("setup failed");

    // "Maintenant" à 2h avant le début du créneau (2026-09-07 18:00).
    const proche = new Date(2026, 8, 7, 16, 0);
    const resultat = await annulerReservation(reservation.id, user.id, proche);

    expect(resultat).toEqual({ ok: false, raison: "trop_tard" });
  });

  it("allows cancelling exactly at the 24h boundary", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    const reservation = await creerReservation({
      terrainId: terrain.id, userId: user.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    if (!reservation.ok) throw new Error("setup failed");

    // Exactement 24h avant 2026-09-07 18:00.
    const limite = new Date(2026, 8, 6, 18, 0);
    const resultat = await annulerReservation(reservation.id, user.id, limite);

    expect(resultat).toEqual({ ok: true });
  });

  it("refuses to cancel someone else's reservation", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");
    const reservation = await creerReservation({
      terrainId: terrain.id, userId: userA.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    if (!reservation.ok) throw new Error("setup failed");

    const resultat = await annulerReservation(reservation.id, userB.id, new Date(2026, 8, 1));
    expect(resultat).toEqual({ ok: false, raison: "introuvable" });
  });

  it("refuses to cancel an unknown reservation", async () => {
    const user = await creerUtilisateur("a@example.com");
    const resultat = await annulerReservation("inconnu", user.id, new Date(2026, 8, 1));
    expect(resultat).toEqual({ ok: false, raison: "introuvable" });
  });

  it("lists a user's reservations ordered by date, marking cancellability", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    await creerReservation({
      terrainId: terrain.id, userId: user.id, date: "2026-09-10", heureDebut: "18:00", heureFin: "19:30",
    });
    await creerReservation({
      terrainId: terrain.id, userId: user.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });

    const liste = await findReservationsForUser(user.id, new Date(2026, 8, 1));
    expect(liste.map((r) => r.date)).toEqual(["2026-09-07", "2026-09-10"]);
    expect(liste.every((r) => r.annulable)).toBe(true);
    expect(liste[0].terrainNom).toBe("Terrain Test");
  });

  it("marks a cancelled reservation as not cancellable and keeps it in the list", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    const reservation = await creerReservation({
      terrainId: terrain.id, userId: user.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    if (!reservation.ok) throw new Error("setup failed");
    await annulerReservation(reservation.id, user.id, new Date(2026, 8, 1));

    const liste = await findReservationsForUser(user.id, new Date(2026, 8, 1));
    expect(liste).toHaveLength(1);
    expect(liste[0].statut).toBe("annulee");
    expect(liste[0].annulable).toBe(false);
  });
});
```

- [ ] **Step 5: Lancer le test — il doit échouer, `src/lib/reservations/queries.ts` n'existe pas encore**

Run: `npx vitest run tests/lib/reservations/queries.test.ts`
Expected: FAIL — `Cannot find module '@/lib/reservations/queries'`.

- [ ] **Step 6: Créer `src/lib/reservations/queries.ts`**

```ts
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DELAI_ANNULATION_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" + "HH:MM" locale → Date locale (pas d'aller-retour UTC). */
function versDateLocale(date: string, heure: string): Date {
  const [annee, mois, jour] = date.split("-").map(Number);
  const [h, m] = heure.split(":").map(Number);
  return new Date(annee, mois - 1, jour, h, m);
}

export async function findTakenSlotsForTerrains(
  terrainIds: string[],
  date: string
): Promise<Map<string, string[]>> {
  const reservations = await prisma.reservation.findMany({
    where: { terrainId: { in: terrainIds }, date, statut: "confirmee" },
    select: { terrainId: true, heureDebut: true },
  });

  const parTerrain = new Map<string, string[]>();
  for (const r of reservations) {
    const liste = parTerrain.get(r.terrainId) ?? [];
    liste.push(r.heureDebut);
    parTerrain.set(r.terrainId, liste);
  }
  return parTerrain;
}

export async function findTakenSlots(terrainId: string, date: string): Promise<string[]> {
  const parTerrain = await findTakenSlotsForTerrains([terrainId], date);
  return parTerrain.get(terrainId) ?? [];
}

export type CreerReservationInput = {
  terrainId: string;
  userId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
};

export type CreerReservationResultat =
  | { ok: true; id: string }
  | { ok: false; raison: "conflit" };

export async function creerReservation(
  input: CreerReservationInput
): Promise<CreerReservationResultat> {
  try {
    const reservation = await prisma.reservation.create({ data: input });
    return { ok: true, id: reservation.id };
  } catch (error) {
    // P2002 = violation de contrainte d'unicité. Le seul index unique sur
    // Reservation est l'index partiel "un seul créneau confirmé par
    // terrain/date/heure" ajouté à la main dans la migration (voir Task 1,
    // Step 2) — Prisma le détecte via le SQLSTATE Postgres 23505 renvoyé par
    // le driver, pas via son propre schéma, donc ça fonctionne même pour un
    // index qu'il n'a pas déclaré lui-même. N'importe quel P2002 ici signifie
    // donc sans ambiguïté "ce créneau est déjà réservé".
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, raison: "conflit" };
    }
    throw error;
  }
}

export type AnnulerReservationResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "trop_tard" };

export async function annulerReservation(
  id: string,
  userId: string,
  maintenant: Date = new Date()
): Promise<AnnulerReservationResultat> {
  const reservation = await prisma.reservation.findFirst({
    where: { id, userId, statut: "confirmee" },
  });

  // Ne jamais distinguer "n'existe pas" de "appartient à quelqu'un d'autre" —
  // même principe que le 404 terrain inactif du sous-projet Terrains.
  if (!reservation) return { ok: false, raison: "introuvable" };

  const debutCreneau = versDateLocale(reservation.date, reservation.heureDebut);
  if (debutCreneau.getTime() - maintenant.getTime() < DELAI_ANNULATION_MS) {
    return { ok: false, raison: "trop_tard" };
  }

  await prisma.reservation.update({
    where: { id },
    data: { statut: "annulee", canceledAt: maintenant },
  });

  return { ok: true };
}

export type ReservationAnnulable = {
  id: string;
  terrainId: string;
  terrainNom: string;
  terrainVille: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  statut: "confirmee" | "annulee";
  annulable: boolean;
};

export async function findReservationsForUser(
  userId: string,
  maintenant: Date = new Date()
): Promise<ReservationAnnulable[]> {
  const reservations = await prisma.reservation.findMany({
    where: { userId },
    include: { terrain: { select: { nom: true, ville: true } } },
    orderBy: [{ date: "asc" }, { heureDebut: "asc" }],
  });

  return reservations.map((r) => {
    const debutCreneau = versDateLocale(r.date, r.heureDebut);
    const annulable =
      r.statut === "confirmee" &&
      debutCreneau.getTime() - maintenant.getTime() >= DELAI_ANNULATION_MS;

    return {
      id: r.id,
      terrainId: r.terrainId,
      terrainNom: r.terrain.nom,
      terrainVille: r.terrain.ville,
      date: r.date,
      heureDebut: r.heureDebut,
      heureFin: r.heureFin,
      statut: r.statut,
      annulable,
    };
  });
}
```

- [ ] **Step 7: Lancer le test de nouveau**

Run: `npx vitest run tests/lib/reservations/queries.test.ts`
Expected: PASS, 10/10.

**Si le test de concurrence échoue** (les deux requêtes réussissent, ou les deux échouent) : vérifier que la migration Step 2 a bien été appliquée (`npx prisma migrate status`), et que l'erreur réellement levée par `prisma.reservation.create()` sur un conflit porte bien le code `P2002` — logguer `error.code` temporairement dans le `catch` si besoin pour l'observer, puis retirer le log avant de commit. Si le code observé diffère de `P2002`, adapter la condition du `catch` en conséquence : c'est le comportement réel de Prisma qui fait foi, pas ce plan.

- [ ] **Step 8: Lancer la suite complète, lint et build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations tests/setup/testDb.ts src/lib/reservations/queries.ts tests/lib/reservations/queries.test.ts
git commit -m "feat(reservations): add Reservation model and query layer with concurrency-safe booking"
```

---

### Task 2: Couture disponibilités + API de réservation

**Files:**
- Modify: `src/lib/terrains/queries.ts`
- Modify: `tests/lib/terrains/queries.test.ts`
- Modify: `src/lib/validation/terrain.ts`
- Create: `src/lib/validation/reservation.ts`
- Test: `tests/lib/validation/reservation.test.ts`
- Create: `src/app/api/terrains/[id]/reservations/route.ts`
- Create: `src/app/api/reservations/[id]/annuler/route.ts`
- Test: `tests/api/reservations.test.ts`

**Interfaces:**
- Consumes (Task 1): `findTakenSlots`, `findTakenSlotsForTerrains`, `creerReservation`, `annulerReservation` from `@/lib/reservations/queries`.
- Produces: `POST /api/terrains/[id]/reservations` (201/400/401/404/409), `POST /api/reservations/[id]/annuler` (200/401/404/409) — consommés par Task 3 et Task 4.

- [ ] **Step 1: Exporter `dateSchema` et `heureSchema` depuis `src/lib/validation/terrain.ts`**

Dans `src/lib/validation/terrain.ts`, changer `const dateSchema` en `export const dateSchema` et `const heureSchema` en `export const heureSchema` (deux mots-clés `export` ajoutés, rien d'autre ne change dans ce fichier).

- [ ] **Step 2: Créer `src/lib/validation/reservation.ts`**

```ts
import { z } from "zod";
import { dateSchema, heureSchema } from "@/lib/validation/terrain";

export const reservationSchema = z.object({
  date: dateSchema,
  heureDebut: heureSchema,
});

export type ReservationInput = z.infer<typeof reservationSchema>;
```

- [ ] **Step 3: Créer `tests/lib/validation/reservation.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { reservationSchema } from "@/lib/validation/reservation";

describe("reservationSchema", () => {
  it("accepts a valid payload", () => {
    const result = reservationSchema.safeParse({ date: "2026-09-07", heureDebut: "18:00" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid date", () => {
    const result = reservationSchema.safeParse({ date: "2026-13-01", heureDebut: "18:00" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid heure", () => {
    const result = reservationSchema.safeParse({ date: "2026-09-07", heureDebut: "25:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing date", () => {
    const result = reservationSchema.safeParse({ heureDebut: "18:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing heureDebut", () => {
    const result = reservationSchema.safeParse({ date: "2026-09-07" });
    expect(result.success).toBe(false);
  });
});
```

Run: `npx vitest run tests/lib/validation/reservation.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 4: Remplacer `src/lib/terrains/queries.ts` par (couture avec les réservations réelles)**

```ts
import type { Prisma, TerrainFormat, TerrainType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSlots, type Slot } from "@/lib/terrains/slots";
import { findTakenSlots, findTakenSlotsForTerrains } from "@/lib/reservations/queries";
import type { TerrainListQuery } from "@/lib/validation/terrain";

export type TerrainResume = {
  id: string;
  nom: string;
  ville: string;
  adresse: string;
  type: TerrainType;
  format: TerrainFormat;
  prixParCreneau: number;
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
  format: TerrainFormat;
  prixParCreneau: number;
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

export async function findTerrains(
  query: TerrainListQuery,
  maintenant: Date = new Date()
): Promise<TerrainResume[]> {
  const where: Prisma.TerrainWhereInput = { statut: "actif" };

  if (query.ville) {
    where.ville = { equals: query.ville, mode: "insensitive" };
  }
  if (query.format) {
    where.format = query.format;
  }
  if (query.prixMax !== undefined) {
    where.prixParCreneau = { lte: query.prixMax };
  }

  const terrains = await prisma.terrain.findMany({
    where,
    include: { horaires: true },
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

    return {
      terrain,
      creneaux,
      resume: {
        id: terrain.id,
        nom: terrain.nom,
        ville: terrain.ville,
        adresse: terrain.adresse,
        type: terrain.type,
        format: terrain.format,
        prixParCreneau: terrain.prixParCreneau,
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
    include: { horaires: true },
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
    format: terrain.format,
    prixParCreneau: terrain.prixParCreneau,
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

- [ ] **Step 5: Ajouter un test d'intégration à `tests/lib/terrains/queries.test.ts`**

Ajouter ce cas dans le `describe("findTerrainById", ...)` existant, juste avant sa dernière accolade fermante :

```ts
  it("excludes a slot taken by a real reservation", async () => {
    const terrain = await creerTerrain({
      nom: "AvecReservation",
      horaires: { create: [{ jourSemaine: 1, ouvre: "18:00", ferme: "19:30" }] },
    });
    const user = await prisma.user.create({
      data: { email: "resa@example.com", passwordHash: await hashPassword("motdepasse123") },
    });
    await prisma.reservation.create({
      data: {
        terrainId: terrain.id,
        userId: user.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
      },
    });

    const resultat = await findTerrainById(terrain.id, "2026-09-07", LUNDI_TOT);
    expect(resultat?.creneaux[0].disponible).toBe(false);
  });
```

Ajouter l'import de `hashPassword` en haut du fichier (à côté des imports existants) :

```ts
import { hashPassword } from "@/lib/password";
```

Run: `npx vitest run tests/lib/terrains/queries.test.ts`
Expected: PASS, tous les tests existants plus le nouveau.

- [ ] **Step 6: Créer `src/app/api/terrains/[id]/reservations/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findTerrainById } from "@/lib/terrains/queries";
import { creerReservation } from "@/lib/reservations/queries";
import { reservationSchema } from "@/lib/validation/reservation";
import { parseJsonBody } from "@/lib/api/parseJsonBody";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = reservationSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Revalide côté serveur que le créneau demandé existe réellement et est
  // disponible pour cette date — ne jamais faire confiance à ce que le
  // client affichait.
  const terrain = await findTerrainById(id, parsed.data.date);
  if (!terrain) {
    return NextResponse.json({ error: "Terrain introuvable" }, { status: 404 });
  }

  const creneau = terrain.creneaux.find((c) => c.debut === parsed.data.heureDebut);
  if (!creneau || !creneau.disponible) {
    return NextResponse.json(
      { error: { heureDebut: ["Ce créneau n'est plus disponible."] } },
      { status: 409 }
    );
  }

  const resultat = await creerReservation({
    terrainId: id,
    userId: session.user.id,
    date: parsed.data.date,
    heureDebut: creneau.debut,
    heureFin: creneau.fin,
  });

  if (!resultat.ok) {
    return NextResponse.json(
      { error: { heureDebut: ["Ce créneau vient d'être réservé."] } },
      { status: 409 }
    );
  }

  return NextResponse.json({ id: resultat.id }, { status: 201 });
}
```

- [ ] **Step 7: Créer `src/app/api/reservations/[id]/annuler/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { annulerReservation } from "@/lib/reservations/queries";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;

  const resultat = await annulerReservation(id, session.user.id);

  if (!resultat.ok) {
    if (resultat.raison === "introuvable") {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Annulation impossible à moins de 24h du créneau." },
      { status: 409 }
    );
  }

  return NextResponse.json({ message: "Réservation annulée." });
}
```

- [ ] **Step 8: Créer `tests/api/reservations.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST as reserver } from "@/app/api/terrains/[id]/reservations/route";
import { POST as annuler } from "@/app/api/reservations/[id]/annuler/route";

async function creerTerrain() {
  return prisma.terrain.create({
    data: {
      nom: "Terrain Test",
      adresse: "Adresse",
      ville: "Tunis",
      type: "gazon_synthetique",
      format: "cinq",
      prixParCreneau: 50000,
      horaires: { create: [{ jourSemaine: 1, ouvre: "08:00", ferme: "20:00" }] },
    },
  });
}

async function creerUtilisateur(email: string) {
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword("motdepasse123") },
  });
}

function makeReservationRequest(body: unknown) {
  return new Request("http://localhost/api/terrains/x/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/terrains/[id]/reservations", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const terrain = await creerTerrain();

    const response = await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:00" }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    expect(response.status).toBe(401);
  });

  it("creates a reservation for a real, available slot", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:00" }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    expect(response.status).toBe(201);
    const count = await prisma.reservation.count({ where: { terrainId: terrain.id } });
    expect(count).toBe(1);
  });

  it("rejects a time that doesn't correspond to a real generated slot", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:07" }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    expect(response.status).toBe(400);
  });

  it("returns 409 when the slot is already taken", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userA.id } } as never);
    await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:00" }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userB.id } } as never);
    const response = await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:00" }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    expect(response.status).toBe(409);
  });

  it("returns 404 for an unknown terrain", async () => {
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:00" }),
      { params: Promise.resolve({ id: "inconnu" }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 on malformed JSON", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await reserver(
      new Request("http://localhost/api/terrains/x/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ not valid json",
      }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    expect(response.status).toBe(400);
  });
});

describe("POST /api/reservations/[id]/annuler", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await annuler(
      new Request("http://localhost/api/reservations/x/annuler", { method: "POST" }),
      { params: Promise.resolve({ id: "x" }) }
    );
    expect(response.status).toBe(401);
  });

  it("cancels a reservation more than 24h out", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    const reservation = await prisma.reservation.create({
      data: {
        terrainId: terrain.id,
        userId: user.id,
        date: "2099-01-01",
        heureDebut: "18:00",
        heureFin: "19:30",
      },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await annuler(
      new Request(`http://localhost/api/reservations/${reservation.id}/annuler`, { method: "POST" }),
      { params: Promise.resolve({ id: reservation.id }) }
    );

    expect(response.status).toBe(200);
    const updated = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
    expect(updated.statut).toBe("annulee");
  });

  it("returns 404 for someone else's reservation", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");
    const reservation = await prisma.reservation.create({
      data: { terrainId: terrain.id, userId: userA.id, date: "2099-01-01", heureDebut: "18:00", heureFin: "19:30" },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userB.id } } as never);

    const response = await annuler(
      new Request(`http://localhost/api/reservations/${reservation.id}/annuler`, { method: "POST" }),
      { params: Promise.resolve({ id: reservation.id }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns 409 when cancelling less than 24h before the slot", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    const proche = new Date(Date.now() + 60 * 60 * 1000); // dans 1h
    const annee = proche.getFullYear();
    const mois = String(proche.getMonth() + 1).padStart(2, "0");
    const jour = String(proche.getDate()).padStart(2, "0");
    const heure = String(proche.getHours()).padStart(2, "0");
    const minute = String(proche.getMinutes()).padStart(2, "0");

    const reservation = await prisma.reservation.create({
      data: {
        terrainId: terrain.id,
        userId: user.id,
        date: `${annee}-${mois}-${jour}`,
        heureDebut: `${heure}:${minute}`,
        heureFin: `${heure}:${minute}`,
      },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await annuler(
      new Request(`http://localhost/api/reservations/${reservation.id}/annuler`, { method: "POST" }),
      { params: Promise.resolve({ id: reservation.id }) }
    );

    expect(response.status).toBe(409);
  });
});
```

- [ ] **Step 9: Lancer la suite complète, lint et build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert. `/api/terrains/[id]/reservations` et `/api/reservations/[id]/annuler` apparaissent comme nouvelles routes dynamiques (`ƒ`) dans la sortie du build.

- [ ] **Step 10: Commit**

```bash
git add src/lib/terrains/queries.ts tests/lib/terrains/queries.test.ts src/lib/validation/terrain.ts src/lib/validation/reservation.ts tests/lib/validation/reservation.test.ts src/app/api/terrains/[id]/reservations/route.ts src/app/api/reservations/[id]/annuler/route.ts tests/api/reservations.test.ts
git commit -m "feat(reservations): wire real availability into terrain queries and add booking/cancel API"
```

---

### Task 3: Sélecteur de créneaux interactif

**Files:**
- Modify: `src/components/terrains/CreneauxListe.tsx`
- Modify: `tests/components/CreneauxListe.test.tsx`
- Modify: `src/app/terrains/[id]/page.tsx`

**Interfaces:**
- Consumes (Task 2): `POST /api/terrains/[id]/reservations` — contrat `{date, heureDebut} → 201 | 400 | 401 | 404 | 409`.
- Ce composant ne dépend d'aucun autre fichier de Task 4 — exécutable en parallèle.

- [ ] **Step 1: Remplacer `src/components/terrains/CreneauxListe.tsx` par**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Slot } from "@/lib/terrains/slots";

export function CreneauxListe({
  terrainId,
  date,
  creneaux,
}: {
  terrainId: string;
  date: string;
  creneaux: Slot[];
}) {
  const router = useRouter();
  const { status } = useSession();
  const [selection, setSelection] = useState<Slot | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  function choisir(creneau: Slot) {
    if (status === "loading") return;

    if (status !== "authenticated") {
      const retour = encodeURIComponent(`/terrains/${terrainId}?date=${date}`);
      router.push(`/connexion?callbackUrl=${retour}`);
      return;
    }

    setErreur("");
    setSelection(creneau);
  }

  async function confirmer() {
    if (!selection) return;
    setEnvoi(true);

    try {
      const response = await fetch(`/api/terrains/${terrainId}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, heureDebut: selection.debut }),
      });

      if (!response.ok) {
        setErreur(
          response.status === 409
            ? "Ce créneau vient d'être réservé par quelqu'un d'autre."
            : "Une erreur est survenue. Veuillez réessayer."
        );
        router.refresh();
        return;
      }

      setSelection(null);
      setErreur("");
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  function annulerSelection() {
    setSelection(null);
    setErreur("");
  }

  if (creneaux.length === 0) {
    return (
      <p className="py-6 text-center text-gray-600">
        Aucun créneau pour cette date.
      </p>
    );
  }

  return (
    <div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {creneaux.map((creneau) => {
          const estSelectionne = selection?.debut === creneau.debut;
          return (
            <li key={creneau.debut}>
              {creneau.disponible ? (
                <button
                  type="button"
                  onClick={() => choisir(creneau)}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center transition ${
                    estSelectionne
                      ? "border-2 border-accent bg-accent/10"
                      : "border-gray-200 bg-white hover:border-primary"
                  }`}
                >
                  <span className="text-sm font-medium text-anthracite">
                    {creneau.debut} — {creneau.fin}
                  </span>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-100 bg-gray-50 px-2 py-3 text-center">
                  <span className="text-sm font-medium text-gray-400 line-through">
                    {creneau.debut} — {creneau.fin}
                  </span>
                  <span className="text-xs text-gray-500">Réservé</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {selection && (
        <div className="mt-4 rounded-lg border border-accent bg-accent/10 p-3">
          <p className="text-sm font-medium text-anthracite">
            Réserver {selection.debut} — {selection.fin} le {date} ?
          </p>
          {erreur && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {erreur}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmer}
              disabled={envoi}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
            >
              {envoi ? "Réservation..." : "Confirmer"}
            </button>
            <button
              type="button"
              onClick={annulerSelection}
              disabled={envoi}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-anthracite disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Remplacer `tests/components/CreneauxListe.test.tsx` par**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreneauxListe } from "@/components/terrains/CreneauxListe";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

let sessionStatus = "authenticated";
vi.mock("next-auth/react", () => ({
  useSession: () => ({ status: sessionStatus }),
}));

describe("CreneauxListe", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    sessionStatus = "authenticated";
    global.fetch = vi.fn();
  });

  it("lists each slot's start and end time", () => {
    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[
          { debut: "08:00", fin: "09:30", disponible: true },
          { debut: "09:30", fin: "11:00", disponible: true },
        ]}
      />
    );

    expect(screen.getByText("08:00 — 09:30")).toBeInTheDocument();
    expect(screen.getByText("09:30 — 11:00")).toBeInTheDocument();
  });

  it("shows an empty state when there is no slot", () => {
    render(<CreneauxListe terrainId="t1" date="2026-09-07" creneaux={[]} />);
    expect(screen.getByText(/Aucun créneau/)).toBeInTheDocument();
  });

  it("marks an unavailable slot as taken and not clickable", () => {
    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: false }]}
      />
    );

    expect(screen.getByText(/Réservé/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows a confirmation panel when an available slot is clicked", () => {
    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]}
      />
    );

    fireEvent.click(screen.getByText("08:00 — 09:30"));

    expect(screen.getByText(/Réserver 08:00 — 09:30 le 2026-09-07/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeInTheDocument();
  });

  it("closes the confirmation panel on Annuler", () => {
    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]}
      />
    );

    fireEvent.click(screen.getByText("08:00 — 09:30"));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("button", { name: "Confirmer" })).not.toBeInTheDocument();
  });

  it("redirects to /connexion instead of showing a confirmation panel when logged out", () => {
    sessionStatus = "unauthenticated";
    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]}
      />
    );

    fireEvent.click(screen.getByText("08:00 — 09:30"));

    expect(pushMock).toHaveBeenCalledWith(
      "/connexion?callbackUrl=%2Fterrains%2Ft1%3Fdate%3D2026-09-07"
    );
    expect(screen.queryByRole("button", { name: "Confirmer" })).not.toBeInTheDocument();
  });

  it("books the slot on confirm and refreshes the page data", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "r1" }),
    } as Response);

    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]}
      />
    );

    fireEvent.click(screen.getByText("08:00 — 09:30"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/terrains/t1/reservations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ date: "2026-09-07", heureDebut: "08:00" }),
      })
    );
  });

  it("shows an error and keeps the panel open when the slot was just taken", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 409 } as Response);

    render(
      <CreneauxListe
        terrainId="t1"
        date="2026-09-07"
        creneaux={[{ debut: "08:00", fin: "09:30", disponible: true }]}
      />
    );

    fireEvent.click(screen.getByText("08:00 — 09:30"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() =>
      expect(screen.getByText(/vient d'être réservé/)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Lancer le test du composant**

Run: `npx vitest run tests/components/CreneauxListe.test.tsx`
Expected: PASS, 9/9.

- [ ] **Step 4: Mettre à jour `src/app/terrains/[id]/page.tsx`**

Dans la section `<section className="mt-6 ...">`, remplacer :

```tsx
        <div className="mt-3">
          <CreneauxListe creneaux={terrain.creneaux} />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          La réservation en ligne arrive bientôt.
        </p>
```

par :

```tsx
        <div className="mt-3">
          <CreneauxListe terrainId={terrain.id} date={terrain.date} creneaux={terrain.creneaux} />
        </div>
```

(la réservation fonctionne désormais réellement — le texte d'attente disparaît. Rien d'autre dans ce fichier ne change.)

- [ ] **Step 5: Lancer la suite complète, lint et build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert.

- [ ] **Step 6: Vérification visuelle manuelle**

Run: `npm run dev -- -p 3100` (dans un terminal séparé, tuer le serveur après vérification)

Dans un navigateur : ouvrir `http://localhost:3100/terrains/<un-id-de-terrain-seedé>`, cliquer un créneau libre → le panneau de confirmation apparaît → confirmer → le créneau passe en « Réservé ». Se déconnecter, recharger la page, cliquer un créneau libre → redirection vers `/connexion`.

- [ ] **Step 7: Commit**

```bash
git add src/components/terrains/CreneauxListe.tsx tests/components/CreneauxListe.test.tsx "src/app/terrains/[id]/page.tsx"
git commit -m "feat(reservations): make the slot picker interactive with a confirm step"
```

---

### Task 4: Liste des réservations sur le tableau de bord

**Files:**
- Create: `src/components/reservations/ListeReservations.tsx`
- Test: `tests/components/ListeReservations.test.tsx`
- Modify: `src/app/tableau-de-bord/page.tsx`

**Interfaces:**
- Consumes (Task 1): `findReservationsForUser(userId, maintenant?)` from `@/lib/reservations/queries`, type `ReservationAnnulable`.
- Consumes (Task 2): `POST /api/reservations/[id]/annuler` — contrat `{} → 200 | 401 | 404 | 409`.
- Aucun fichier en commun avec Task 3 — exécutable en parallèle.

- [ ] **Step 1: Créer `src/components/reservations/ListeReservations.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReservationAnnulable } from "@/lib/reservations/queries";

function estPassee(reservation: ReservationAnnulable, maintenant: Date): boolean {
  const [annee, mois, jour] = reservation.date.split("-").map(Number);
  const [h, m] = reservation.heureDebut.split(":").map(Number);
  const debut = new Date(annee, mois - 1, jour, h, m);
  return debut.getTime() < maintenant.getTime();
}

export function ListeReservations({ reservations }: { reservations: ReservationAnnulable[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");

  if (reservations.length === 0) {
    return <p className="mt-4 text-gray-600">Vous n&apos;avez aucune réservation.</p>;
  }

  const maintenant = new Date();
  const aVenir = reservations.filter(
    (r) => r.statut === "confirmee" && !estPassee(r, maintenant)
  );
  const passees = reservations.filter(
    (r) => r.statut !== "confirmee" || estPassee(r, maintenant)
  );

  async function annuler(id: string) {
    setEnCours(id);
    setErreur("");

    try {
      const response = await fetch(`/api/reservations/${id}/annuler`, { method: "POST" });
      if (!response.ok) {
        setErreur("Impossible d'annuler cette réservation.");
        return;
      }
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-6">
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}

      <section>
        <h2 className="text-sm font-semibold text-anthracite">À venir</h2>
        <p className="mt-1 text-xs text-gray-500">
          Annulation possible jusqu&apos;à 24h avant le créneau.
        </p>
        {aVenir.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Aucune réservation à venir.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {aVenir.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-anthracite">{r.terrainNom}</p>
                  <p className="text-xs text-gray-600">
                    {r.terrainVille} · {r.date} · {r.heureDebut} — {r.heureFin}
                  </p>
                </div>
                {r.annulable ? (
                  <button
                    type="button"
                    onClick={() => annuler(r.id)}
                    disabled={enCours === r.id}
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {enCours === r.id ? "Annulation..." : "Annuler"}
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">Non annulable</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {passees.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-anthracite">Passées</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {passees.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-500">{r.terrainNom}</p>
                  <p className="text-xs text-gray-400">
                    {r.terrainVille} · {r.date} · {r.heureDebut} — {r.heureFin}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {r.statut === "annulee" ? "Annulée" : "Terminée"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Créer `tests/components/ListeReservations.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ListeReservations } from "@/components/reservations/ListeReservations";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const reservationAVenir = {
  id: "r1",
  terrainId: "t1",
  terrainNom: "Complexe El Menzah",
  terrainVille: "Tunis",
  date: "2099-01-01",
  heureDebut: "18:00",
  heureFin: "19:30",
  statut: "confirmee" as const,
  annulable: true,
};

describe("ListeReservations", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("shows an empty state when there is no reservation", () => {
    render(<ListeReservations reservations={[]} />);
    expect(screen.getByText(/aucune réservation/i)).toBeInTheDocument();
  });

  it("lists an upcoming reservation with a cancel button", () => {
    render(<ListeReservations reservations={[reservationAVenir]} />);

    expect(screen.getByText("Complexe El Menzah")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
  });

  it("hides the cancel button and explains why when not cancellable", () => {
    render(
      <ListeReservations reservations={[{ ...reservationAVenir, annulable: false }]} />
    );

    expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
    expect(screen.getByText("Non annulable")).toBeInTheDocument();
  });

  it("cancels a reservation and refreshes", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response);
    render(<ListeReservations reservations={[reservationAVenir]} />);

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith("/api/reservations/r1/annuler", { method: "POST" });
  });

  it("shows an error message when cancellation fails", async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);
    render(<ListeReservations reservations={[reservationAVenir]} />);

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    await waitFor(() =>
      expect(screen.getByText("Impossible d'annuler cette réservation.")).toBeInTheDocument()
    );
  });

  it("shows past reservations separately without a cancel action", () => {
    render(
      <ListeReservations
        reservations={[{ ...reservationAVenir, date: "2020-01-01", statut: "confirmee" as const }]}
      />
    );

    expect(screen.getByText("Terminée")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Annuler" })).not.toBeInTheDocument();
  });

  it("labels a cancelled reservation distinctly from a past-but-not-cancelled one", () => {
    render(
      <ListeReservations
        reservations={[{ ...reservationAVenir, statut: "annulee" as const, annulable: false }]}
      />
    );

    expect(screen.getByText("Annulée")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Lancer le test du composant**

Run: `npx vitest run tests/components/ListeReservations.test.tsx`
Expected: PASS, 7/7.

- [ ] **Step 4: Remplacer `src/app/tableau-de-bord/page.tsx` par**

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findReservationsForUser } from "@/lib/reservations/queries";
import { ListeReservations } from "@/components/reservations/ListeReservations";

export default async function TableauDeBordPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  const reservations = await findReservationsForUser(session.user.id);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10">
      <h1 className="text-xl font-semibold text-anthracite">Tableau de bord</h1>
      <p className="mt-2 text-gray-600">Bienvenue {session.user.email}.</p>
      <ListeReservations reservations={reservations} />
    </main>
  );
}
```

- [ ] **Step 5: Lancer la suite complète, lint et build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert.

- [ ] **Step 6: Commit**

```bash
git add src/components/reservations/ListeReservations.tsx tests/components/ListeReservations.test.tsx src/app/tableau-de-bord/page.tsx
git commit -m "feat(reservations): show and cancel the player's reservations on the dashboard"
```

---

## Self-Review Notes (controller-facing, not a task)

- **Spec coverage :** modèle + anti-double-réservation (Task 1), couture disponibilités + API créer/annuler (Task 2), sélecteur interactif avec redirection si déconnecté (Task 3), liste + annulation 24h sur le tableau de bord (Task 4) — toutes les sections de la spec sont couvertes. Paiement et vue propriétaire : explicitement hors périmètre, aucune tâche ne les introduit.
- **Aucun placeholder :** chaque step contient le code complet.
- **Cohérence de types :** `ReservationAnnulable`, `CreerReservationInput/Resultat`, `AnnulerReservationResultat` définis une seule fois (Task 1) et réutilisés à l'identique dans Task 2 (route), Task 4 (composant) sans renommage.
- **Risque de régression de test :** `tests/components/CreneauxListe.test.tsx` est entièrement réécrit (comportement volontairement différent — c'est l'objet même de ce sous-projet) ; `tests/lib/terrains/queries.test.ts` reçoit un ajout, tous ses tests existants restent inchangés et continuent de passer (`taken` était déjà `[]` par défaut dans leurs fixtures, donc leur résultat ne change pas).
- **Ordre de dépendance :** Task 1 → Task 2 → {Task 3 ∥ Task 4}. Aucune tâche parallèle ne partage de fichier.
