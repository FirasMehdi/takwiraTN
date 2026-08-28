# Match Hoster (Terrain Owner) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dedicated registration path that lets a signing-up user opt in as a terrain owner (server-assigned `role: "proprietaire"`), and a full terrain-management area scoped to each hoster's own terrains: create/edit/delete terrains, manage multi-format pricing/capacity, manage working hours.

**Architecture:** All terrain-mutation logic lives in one new file, `src/lib/terrains/gestion.ts`, which every function gates with an `ownerId === terrain.ownerId` check and returns typed `{ok:false, raison:...}` results (never throws for expected failure paths). A new validation module `src/lib/validation/proprietaire.ts` holds the zod schemas. A tree of `/api/proprietaire/terrains/**` routes wraps `gestion.ts` with `requireRole(session, "proprietaire")` plus session auth. A `/proprietaire/**` page tree (server components, following the existing `getServerSession` + redirect convention) renders the dashboard, terrain list, create form, and edit page (base fields + formats manager + horaires manager, each a small client component). Signup gets one additive field, `estProprietaire`, which the server — never the client — turns into a `role`.

**Tech Stack:** Next.js 15 App Router, TypeScript (strict), Prisma 5 + PostgreSQL, NextAuth v4 (JWT sessions), Zod, Tailwind, Vitest + Testing Library.

**Spec:** This plan's own header block above (from the controlling task brief) is the spec — there is no separate spec file for this sub-project; the brief given to the planning agent is reproduced in full in the "Scope Boundaries" and "Required Surface" sections below.

## Global Constraints

- Work happens only inside `C:\Users\firas\OneDrive\Bureau\TakiwraTN\.worktrees\wave2-hoster` on branch `wave2-hoster`. Do not `npm ci`. Do not push. Do not merge to `main`.
- All terrain-mutation logic (create/edit/delete terrain, format CRUD, horaires replace) lives in `src/lib/terrains/gestion.ts` — no other file in this plan writes to `Terrain`, `TerrainFormatOffre`, or `TerrainHoraire`.
- Every `gestion.ts` mutation function takes the acting `ownerId` and verifies `terrain.ownerId === ownerId` before writing, returning `{ok:false, raison:...}` — never throwing for an expected authorization/not-found failure.
- Every hoster page and API route calls `requireRole(session, "proprietaire")` from `src/lib/auth/authorization.ts` (existing, do not modify) in addition to the ownership check.
- `role` on `User` is never read from client input — the signup route derives it solely from the server-validated `estProprietaire: boolean`.
- A newly created terrain always has `ownerId` set to the acting hoster (never null) and always has at least one `TerrainFormatOffre` and at least one `TerrainHoraire` row (enforced both client-side and by zod `.min(1)`).
- Do not modify: `src/lib/terrains/queries.ts` (its exports/types — read-only reference), `src/app/admin/**`, `src/lib/admin/**`, `src/lib/matchs/queries.ts`, `src/app/matchs/**`, `src/components/matchs/**`, `src/app/page.tsx`, `tests/setup/testDb.ts`.
- `src/middleware.ts` gets exactly one additive line (`"/proprietaire/:path*"` in the matcher array) — nothing else in that file changes.
- French domain vocabulary throughout: `creerX`/`trouverX`/`modifierX`/`supprimerX`/`listerX`/`ajouterX` naming for query/mutation functions, French labels and error copy in UI, matching existing files like `src/lib/matchs/queries.ts` and `src/lib/amis/queries.ts`.
- Prices are stored in millimes (1 TND = 1000 millimes); UI inputs collect dinars and convert with `Math.round(Number(dinars) * 1000)` before sending to the API, exactly like the existing `TerrainFiltres.tsx` pattern.
- `jourSemaine` is `0..6`, `0` = Sunday, matching `Date.getDay()` and the existing `generateSlots` consumer.

## Rulings Made While Planning (documented per the brief's "operate autonomously" instruction)

1. **New terrains default to `statut: "en_attente"`, not `"actif"`.** The `TerrainStatut` enum's `en_attente` value has no other producer in the codebase yet; gating new, unmoderated hoster-submitted terrains behind it (so they don't appear in public search until some future activation step flips them to `actif`) is the safer reading, and avoids colliding with whatever the parallel Admin sub-project does with terrain moderation. The hoster-facing UI never exposes a `statut` editor — only reads/displays it.
2. **`supprimerTerrain` refuses deletion when the terrain has a confirmed future `Reservation` or an open/complete future `Match`.** `Reservation.terrainId` and `Match.terrainId` are `onDelete: Cascade` in the schema, so an unguarded delete would silently wipe out real players' bookings. This guard is pure defense added inside `gestion.ts`; no schema change.
3. **Photos are out of scope.** The "Required surface" list in the brief does not mention photos, and there's no upload infrastructure in the codebase; terrains are always created with `photos: []`. The existing `photos: String[]` field is left untouched.
4. **`dureeCreneauMinutes` is included as an editable field (default 90)** even though the brief's required-surface list doesn't name it explicitly, because it's a plain `Terrain` column that directly controls `generateSlots` output — omitting it would make it impossible for a hoster to correctly configure a terrain whose slots aren't 90 minutes (e.g. the existing "Sfax Foot Center" seed terrain uses 60).
5. **`modifierFormat` only updates `capacite`/`prixParCreneau`, never `format` itself.** Changing the format enum value on an existing row risks colliding with the `[terrainId, format]` unique constraint; a hoster who wants a different format enum deletes the row and adds a new one instead.
6. **`modifierHoraires` is a full-replace (delete-all + insert-all in one transaction), not per-row CRUD**, matching how the UI edits a whole week's schedule at once. Both `creerTerrain` and `modifierHoraires` require at least one horaire row (zod `.min(1)`), for the same reason at least one format is required: a terrain with zero operating hours would never generate a slot.
7. **API routes are mutation-only** (POST/PATCH/DELETE/PUT) — pages are server components that call `gestion.ts` functions directly for reads, mirroring the existing convention in `src/app/tableau-de-bord/page.tsx` and `src/app/matchs/creer/page.tsx`. No `GET /api/proprietaire/terrains*` routes exist.
8. **`src/app/profil/page.tsx` gets one small additive change** (a conditional "Gérer mes terrains" link shown when `session.user.role === "proprietaire"`) even though it isn't in the brief's explicit file list, because without it a hoster has no discoverable path into `/proprietaire` from the existing UI. `src/components/nav/BottomNav.tsx` and `TopHeader.tsx` are deliberately left untouched to minimize merge-conflict surface with the three parallel sub-projects.

## Required Surface (from the brief, for traceability)

- Extend `/inscription` + `POST /api/inscription` with `estProprietaire`.
- `/proprietaire` dashboard, `/proprietaire/terrains` list, `/proprietaire/terrains/nouveau` create, `/proprietaire/terrains/[id]/modifier` edit (fields + formats + horaires).
- `/api/proprietaire/terrains/**` routes enforcing role + ownership.

---

## Task A: Extend signup with `estProprietaire`

**Files:**
- Modify: `src/lib/validation/auth.ts`
- Modify: `src/app/api/inscription/route.ts`
- Modify: `src/components/forms/InscriptionForm.tsx`
- Modify: `tests/lib/validation/auth.test.ts`
- Modify: `tests/api/inscription.test.ts`
- Modify: `tests/components/InscriptionForm.test.tsx`

**Interfaces:**
- Produces: `signupSchema` now infers `{ email, password, prenom, ville, estProprietaire: boolean }` (default `false`). Consumed by the inscription route and form; no other task in this plan depends on it.

- [ ] **Step 1: Extend `signupSchema`**

In `src/lib/validation/auth.ts`, add one field to the existing `signupSchema` object (leave every other field exactly as-is):

```ts
export const signupSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(72, "Le mot de passe ne peut pas dépasser 72 caractères"),
  prenom: z.string().min(1, "Le prénom est requis").max(80, "Le prénom est trop long"),
  ville: z.string().min(1, "La ville est requise").max(80, "Le nom de la ville est trop long"),
  // Le rôle n'est JAMAIS accepté depuis le client — seul ce booléen l'est,
  // et le serveur (route /api/inscription) en dérive le rôle réel.
  estProprietaire: z.boolean().optional().default(false),
});
```

- [ ] **Step 2: Add validation tests**

In `tests/lib/validation/auth.test.ts`, inside the existing `describe("signupSchema", ...)` block, add these three `it`s (anywhere among the existing ones, e.g. right after the last existing `it` and before the closing `});` of that `describe`):

```ts
  it("defaults estProprietaire to false when omitted", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estProprietaire).toBe(false);
    }
  });

  it("accepts estProprietaire set to true", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
      estProprietaire: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estProprietaire).toBe(true);
    }
  });

  it("rejects a non-boolean estProprietaire", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
      estProprietaire: "yes",
    });
    expect(result.success).toBe(false);
  });
```

- [ ] **Step 3: Run the validation test file, confirm it passes**

Run: `npx vitest run tests/lib/validation/auth.test.ts`
Expected: all tests PASS (schema change from Step 1 already lands before this run).

- [ ] **Step 4: Wire `estProprietaire` into role assignment in the API route**

In `src/app/api/inscription/route.ts`, replace the body from the destructure through `user.create` with:

```ts
  const { email, password, prenom, ville, estProprietaire } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: { email: ["Cet e-mail est déjà utilisé"] } },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  // Le rôle est TOUJOURS dérivé de ce booléen validé côté serveur — jamais
  // d'un champ `role` envoyé par le client, qui ne serait pas fiable.
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: estProprietaire ? "proprietaire" : "joueur",
      profile: { create: { prenom, ville } },
    },
  });
```

- [ ] **Step 5: Add API tests for role assignment**

In `tests/api/inscription.test.ts`, add these three `it`s inside the existing `describe("POST /api/inscription", ...)` block (after the existing tests, before the closing `});`):

```ts
  it("assigns the proprietaire role when estProprietaire is true", async () => {
    const response = await POST(
      makeRequest({
        email: "hoster@example.com",
        password: "motdepasse123",
        prenom: "Sami",
        ville: "Tunis",
        estProprietaire: true,
      })
    );
    expect(response.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: "hoster@example.com" } });
    expect(user?.role).toBe("proprietaire");
  });

  it("assigns the joueur role by default", async () => {
    const response = await POST(
      makeRequest({
        email: "joueur@example.com",
        password: "motdepasse123",
        prenom: "Sami",
        ville: "Tunis",
      })
    );
    expect(response.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: "joueur@example.com" } });
    expect(user?.role).toBe("joueur");
  });

  it("ignores a client-supplied role and derives it from estProprietaire only", async () => {
    const response = await POST(
      makeRequest({
        email: "sournois@example.com",
        password: "motdepasse123",
        prenom: "Sami",
        ville: "Tunis",
        estProprietaire: false,
        role: "administrateur",
      })
    );
    expect(response.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: "sournois@example.com" } });
    expect(user?.role).toBe("joueur");
  });
```

- [ ] **Step 6: Run the API test file, confirm it passes**

Run: `npx vitest run tests/api/inscription.test.ts`
Expected: all tests PASS.

- [ ] **Step 7: Add the checkbox to `InscriptionForm`**

In `src/components/forms/InscriptionForm.tsx`:

Add state, right after the `ville` state line:
```ts
  const [estProprietaire, setEstProprietaire] = useState(false);
```

Change the fetch body to include it:
```ts
        body: JSON.stringify({ email, password, prenom, ville, estProprietaire }),
```

Add the checkbox markup right before the `{error && (...)}` block:
```tsx
      <div className="flex items-center gap-2">
        <input
          id="estProprietaire"
          type="checkbox"
          checked={estProprietaire}
          onChange={(e) => setEstProprietaire(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="estProprietaire" className="text-sm text-anthracite">
          Es-tu propriétaire d&apos;un terrain ?
        </label>
      </div>
```

- [ ] **Step 8: Add component tests**

In `tests/components/InscriptionForm.test.tsx`, add these two `it`s inside the existing `describe("InscriptionForm", ...)` block:

```tsx
  it("submits estProprietaire=true when the checkbox is checked", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "1", email: "sami@example.com" }),
    } as Response);

    render(<InscriptionForm />);
    fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Sami" } });
    fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Tunis" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "sami@example.com" } });
    fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: "motdepasse123" } });
    fireEvent.click(screen.getByLabelText("Es-tu propriétaire d'un terrain ?"));
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string);
    expect(body.estProprietaire).toBe(true);
  });

  it("submits estProprietaire=false by default", async () => {
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

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string);
    expect(body.estProprietaire).toBe(false);
  });
```

- [ ] **Step 9: Run the component test file, confirm it passes**

Run: `npx vitest run tests/components/InscriptionForm.test.tsx`
Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/validation/auth.ts src/app/api/inscription/route.ts src/components/forms/InscriptionForm.tsx tests/lib/validation/auth.test.ts tests/api/inscription.test.ts tests/components/InscriptionForm.test.tsx
git commit -m "feat(inscription): add estProprietaire toggle, server-derived role"
```

---

## Task B: Add `/proprietaire` to the auth middleware matcher

**Files:**
- Modify: `src/middleware.ts`

**Interfaces:**
- Produces: `/proprietaire/*` now requires a NextAuth session (redirects to `/connexion` otherwise), same as `/profil/*` etc. Consumed by every page task below as the first line of defense (page-level `requireRole` remains the real authorization gate, per the file's own doc comment).

- [ ] **Step 1: Add the matcher entry**

In `src/middleware.ts`, change:

```ts
export const config = {
  matcher: [
    "/profil/:path*",
    "/tableau-de-bord/:path*",
    "/joueurs/:path*",
    "/matchs/creer/:path*",
    "/amis/:path*",
  ],
};
```

to:

```ts
export const config = {
  matcher: [
    "/profil/:path*",
    "/tableau-de-bord/:path*",
    "/joueurs/:path*",
    "/matchs/creer/:path*",
    "/amis/:path*",
    "/proprietaire/:path*",
  ],
};
```

- [ ] **Step 2: Verify with tsc (no dedicated middleware test exists in this codebase)**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(middleware): require auth on /proprietaire routes"
```

---

## Task C: Validation schemas for terrain management

**Files:**
- Create: `src/lib/validation/proprietaire.ts`
- Create: `tests/lib/validation/proprietaire.test.ts`

**Interfaces:**
- Consumes: `formatSchema`, `heureSchema` from `src/lib/validation/terrain.ts` (existing, read-only).
- Produces (consumed by Tasks D–K): `terrainTypeSchema`, `jourSemaineSchema`, `formatOffreSchema`, `horaireSchema`, `terrainBaseSchema`, `creerTerrainSchema`, `modifierTerrainSchema`, `ajouterFormatSchema`, `modifierFormatSchema`, `modifierHorairesSchema`, and inferred types `CreerTerrainInput`, `ModifierTerrainInput`, `AjouterFormatInput`, `ModifierFormatInput`, `ModifierHorairesInput`.

- [ ] **Step 1: Write the test file**

Create `tests/lib/validation/proprietaire.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  terrainTypeSchema,
  formatOffreSchema,
  horaireSchema,
  terrainBaseSchema,
  creerTerrainSchema,
  modifierTerrainSchema,
  ajouterFormatSchema,
  modifierFormatSchema,
  modifierHorairesSchema,
} from "@/lib/validation/proprietaire";

const formatValide = { format: "cinq" as const, capacite: 10, prixParCreneau: 60000 };
const horaireValide = { jourSemaine: 1, ouvre: "08:00", ferme: "22:00" };
const baseValide = {
  nom: "Terrain Test",
  adresse: "Rue Test",
  ville: "Tunis",
  type: "gazon_synthetique" as const,
};

describe("terrainTypeSchema", () => {
  it("accepts the three known types", () => {
    expect(terrainTypeSchema.safeParse("gazon_synthetique").success).toBe(true);
    expect(terrainTypeSchema.safeParse("gazon_naturel").success).toBe(true);
    expect(terrainTypeSchema.safeParse("beton").success).toBe(true);
  });

  it("rejects an unknown type", () => {
    expect(terrainTypeSchema.safeParse("boue").success).toBe(false);
  });
});

describe("formatOffreSchema", () => {
  it("accepts a valid format offer", () => {
    expect(formatOffreSchema.safeParse(formatValide).success).toBe(true);
  });

  it("rejects a capacite below 2", () => {
    expect(formatOffreSchema.safeParse({ ...formatValide, capacite: 1 }).success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(formatOffreSchema.safeParse({ ...formatValide, prixParCreneau: -1 }).success).toBe(false);
  });

  it("rejects an unknown format enum value", () => {
    expect(formatOffreSchema.safeParse({ ...formatValide, format: "treize" }).success).toBe(false);
  });
});

describe("horaireSchema", () => {
  it("accepts a valid horaire", () => {
    expect(horaireSchema.safeParse(horaireValide).success).toBe(true);
  });

  it("rejects ferme before ouvre", () => {
    const result = horaireSchema.safeParse({ ...horaireValide, ouvre: "22:00", ferme: "08:00" });
    expect(result.success).toBe(false);
  });

  it("rejects ferme equal to ouvre", () => {
    const result = horaireSchema.safeParse({ ...horaireValide, ouvre: "10:00", ferme: "10:00" });
    expect(result.success).toBe(false);
  });

  it("rejects a jourSemaine out of range", () => {
    expect(horaireSchema.safeParse({ ...horaireValide, jourSemaine: 7 }).success).toBe(false);
    expect(horaireSchema.safeParse({ ...horaireValide, jourSemaine: -1 }).success).toBe(false);
  });

  it("rejects a malformed heure", () => {
    expect(horaireSchema.safeParse({ ...horaireValide, ouvre: "8h00" }).success).toBe(false);
  });
});

describe("terrainBaseSchema", () => {
  it("accepts a minimal valid payload", () => {
    expect(terrainBaseSchema.safeParse(baseValide).success).toBe(true);
  });

  it("requires a non-empty nom", () => {
    expect(terrainBaseSchema.safeParse({ ...baseValide, nom: "" }).success).toBe(false);
  });

  it("rejects an out-of-range latitude", () => {
    expect(terrainBaseSchema.safeParse({ ...baseValide, latitude: 200 }).success).toBe(false);
  });

  it("accepts a valid latitude/longitude pair", () => {
    expect(
      terrainBaseSchema.safeParse({ ...baseValide, latitude: 36.8, longitude: 10.1 }).success
    ).toBe(true);
  });

  it("rejects a dureeCreneauMinutes below 15", () => {
    expect(terrainBaseSchema.safeParse({ ...baseValide, dureeCreneauMinutes: 10 }).success).toBe(false);
  });
});

describe("creerTerrainSchema", () => {
  it("accepts a full valid payload", () => {
    const result = creerTerrainSchema.safeParse({
      ...baseValide,
      formats: [formatValide],
      horaires: [horaireValide],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty formats array", () => {
    const result = creerTerrainSchema.safeParse({ ...baseValide, formats: [], horaires: [horaireValide] });
    expect(result.success).toBe(false);
  });

  it("rejects an empty horaires array", () => {
    const result = creerTerrainSchema.safeParse({ ...baseValide, formats: [formatValide], horaires: [] });
    expect(result.success).toBe(false);
  });
});

describe("modifierTerrainSchema", () => {
  it("accepts the same shape as terrainBaseSchema, without formats/horaires", () => {
    expect(modifierTerrainSchema.safeParse(baseValide).success).toBe(true);
  });
});

describe("ajouterFormatSchema", () => {
  it("accepts a valid single format", () => {
    expect(ajouterFormatSchema.safeParse(formatValide).success).toBe(true);
  });
});

describe("modifierFormatSchema", () => {
  it("accepts capacite and prixParCreneau without format", () => {
    expect(modifierFormatSchema.safeParse({ capacite: 12, prixParCreneau: 70000 }).success).toBe(true);
  });

  it("rejects a negative capacite", () => {
    expect(modifierFormatSchema.safeParse({ capacite: -1, prixParCreneau: 70000 }).success).toBe(false);
  });
});

describe("modifierHorairesSchema", () => {
  it("accepts a valid horaires array", () => {
    expect(modifierHorairesSchema.safeParse({ horaires: [horaireValide] }).success).toBe(true);
  });

  it("rejects an empty horaires array", () => {
    expect(modifierHorairesSchema.safeParse({ horaires: [] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails (module doesn't exist yet)**

Run: `npx vitest run tests/lib/validation/proprietaire.test.ts`
Expected: FAIL — cannot resolve `@/lib/validation/proprietaire`.

- [ ] **Step 3: Write `src/lib/validation/proprietaire.ts`**

```ts
import { z } from "zod";
import { formatSchema, heureSchema } from "@/lib/validation/terrain";

export const terrainTypeSchema = z.enum(
  ["gazon_synthetique", "gazon_naturel", "beton"],
  { errorMap: () => ({ message: "Type de terrain invalide" }) }
);

export const jourSemaineSchema = z.coerce
  .number()
  .int("Le jour doit être un entier")
  .min(0, "Jour invalide (0 = dimanche, 6 = samedi)")
  .max(6, "Jour invalide (0 = dimanche, 6 = samedi)");

export const formatOffreSchema = z.object({
  format: formatSchema,
  capacite: z.coerce
    .number()
    .int("La capacité doit être un entier")
    .min(2, "La capacité minimale est 2 joueurs")
    .max(30, "La capacité dépasse la limite autorisée"),
  prixParCreneau: z.coerce
    .number()
    .int("Le prix doit être un entier")
    .min(0, "Le prix ne peut pas être négatif")
    .max(2_147_483_647, "Le prix dépasse la limite autorisée"),
});

export const horaireSchema = z
  .object({
    jourSemaine: jourSemaineSchema,
    ouvre: heureSchema,
    ferme: heureSchema,
  })
  .refine((horaire) => horaire.ouvre < horaire.ferme, {
    message: "L'heure de fermeture doit être après l'heure d'ouverture",
    path: ["ferme"],
  });

export const terrainBaseSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis").max(120, "Le nom est trop long"),
  description: z.string().trim().max(1000, "La description est trop longue").optional(),
  adresse: z.string().trim().min(1, "L'adresse est requise").max(200, "L'adresse est trop longue"),
  ville: z.string().trim().min(1, "La ville est requise").max(80, "Le nom de la ville est trop long"),
  latitude: z.coerce.number().min(-90, "Latitude invalide").max(90, "Latitude invalide").optional(),
  longitude: z.coerce.number().min(-180, "Longitude invalide").max(180, "Longitude invalide").optional(),
  type: terrainTypeSchema,
  dureeCreneauMinutes: z.coerce
    .number()
    .int("La durée doit être un entier")
    .min(15, "La durée minimale est 15 minutes")
    .max(240, "La durée maximale est 240 minutes")
    .optional(),
  equipements: z
    .array(z.string().trim().min(1).max(40))
    .max(15, "Trop d'équipements")
    .optional(),
});

export const creerTerrainSchema = terrainBaseSchema.extend({
  formats: z
    .array(formatOffreSchema)
    .min(1, "Il faut proposer au moins un format avec sa capacité et son prix"),
  horaires: z
    .array(horaireSchema)
    .min(1, "Il faut renseigner au moins un horaire d'ouverture"),
});

export const modifierTerrainSchema = terrainBaseSchema;

export const ajouterFormatSchema = formatOffreSchema;

export const modifierFormatSchema = z.object({
  capacite: formatOffreSchema.shape.capacite,
  prixParCreneau: formatOffreSchema.shape.prixParCreneau,
});

export const modifierHorairesSchema = z.object({
  horaires: z
    .array(horaireSchema)
    .min(1, "Il faut renseigner au moins un horaire d'ouverture"),
});

export type CreerTerrainInput = z.infer<typeof creerTerrainSchema>;
export type ModifierTerrainInput = z.infer<typeof modifierTerrainSchema>;
export type AjouterFormatInput = z.infer<typeof ajouterFormatSchema>;
export type ModifierFormatInput = z.infer<typeof modifierFormatSchema>;
export type ModifierHorairesInput = z.infer<typeof modifierHorairesSchema>;
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/lib/validation/proprietaire.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/proprietaire.ts tests/lib/validation/proprietaire.test.ts
git commit -m "feat(validation): add terrain management schemas"
```

---

## Task D: `gestion.ts` — reads + `creerTerrain`

**Files:**
- Create: `src/lib/terrains/gestion.ts`
- Create: `tests/lib/terrains/gestion.test.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma.ts`.
- Produces (consumed by Tasks E–Q): types `FormatInput`, `HoraireInput`, `TerrainBaseInput`, `TerrainGestionResume`, `TerrainGestionDetail`; functions `listerTerrainsProprietaire(ownerId): Promise<TerrainGestionResume[]>`, `trouverTerrainProprietaire(id, ownerId): Promise<TerrainGestionDetail | null>`, `creerTerrain(ownerId, input: TerrainBaseInput & {formats: FormatInput[]; horaires: HoraireInput[]}): Promise<{id: string}>`; private helpers `formatDateLocale` and `verifierProprietaire` (both reused, unexported, by Task E onward — this task defines them but only `creerTerrain`/reads use them so far).

- [ ] **Step 1: Write the test file**

Create `tests/lib/terrains/gestion.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  listerTerrainsProprietaire,
  trouverTerrainProprietaire,
  creerTerrain,
} from "@/lib/terrains/gestion";

async function creerProprietaire(email = "owner@example.com") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role: "proprietaire",
      profile: { create: { prenom: "Owner", ville: "Tunis" } },
    },
  });
}

const inputBase = {
  nom: "Terrain Test",
  adresse: "Rue Test",
  ville: "Tunis",
  type: "gazon_synthetique" as const,
};

const formatValide = { format: "cinq" as const, capacite: 10, prixParCreneau: 60000 };
const horaireValide = { jourSemaine: 1, ouvre: "08:00", ferme: "22:00" };

describe("gestion des terrains propriétaire", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("creerTerrain / listerTerrainsProprietaire / trouverTerrainProprietaire", () => {
    it("creates a terrain owned by the given user, en_attente by default", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, {
        ...inputBase,
        formats: [formatValide],
        horaires: [horaireValide],
      });

      const terrain = await prisma.terrain.findUnique({ where: { id } });
      expect(terrain?.ownerId).toBe(owner.id);
      expect(terrain?.statut).toBe("en_attente");
    });

    it("creates the format and horaire rows alongside the terrain", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, {
        ...inputBase,
        formats: [formatValide],
        horaires: [horaireValide],
      });

      const formats = await prisma.terrainFormatOffre.findMany({ where: { terrainId: id } });
      const horaires = await prisma.terrainHoraire.findMany({ where: { terrainId: id } });
      expect(formats).toHaveLength(1);
      expect(horaires).toHaveLength(1);
    });

    it("lists only the calling owner's terrains", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      await creerTerrain(other.id, {
        ...inputBase,
        nom: "Autre",
        formats: [formatValide],
        horaires: [horaireValide],
      });

      const liste = await listerTerrainsProprietaire(owner.id);
      expect(liste).toHaveLength(1);
      expect(liste[0].nom).toBe("Terrain Test");
      expect(liste[0].nombreFormats).toBe(1);
      expect(liste[0].nombreHoraires).toBe(1);
    });

    it("finds a terrain by id only for its owner", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, {
        ...inputBase,
        formats: [formatValide],
        horaires: [horaireValide],
      });

      expect(await trouverTerrainProprietaire(id, owner.id)).not.toBeNull();
      expect(await trouverTerrainProprietaire(id, other.id)).toBeNull();
    });

    it("returns null for a non-existent terrain id", async () => {
      const owner = await creerProprietaire();
      expect(await trouverTerrainProprietaire("inexistant", owner.id)).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails**

Run: `npx vitest run tests/lib/terrains/gestion.test.ts`
Expected: FAIL — cannot resolve `@/lib/terrains/gestion`.

- [ ] **Step 3: Write `src/lib/terrains/gestion.ts`**

```ts
import type { FormatEquipe, TerrainStatut, TerrainType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Toute la logique de mutation des terrains (création, édition, suppression,
 * formats, horaires) vit ici — c'est le seul endroit du sous-projet Hoster
 * qui écrit sur Terrain / TerrainFormatOffre / TerrainHoraire. La lecture
 * publique (src/lib/terrains/queries.ts) n'est jamais modifiée par ce
 * fichier ; on duplique ici les quelques petits utilitaires dont on a besoin
 * (ex. formatDateLocale) plutôt que d'y toucher.
 */

export type FormatInput = {
  format: FormatEquipe;
  capacite: number;
  prixParCreneau: number;
};

export type HoraireInput = {
  jourSemaine: number;
  ouvre: string;
  ferme: string;
};

export type TerrainBaseInput = {
  nom: string;
  description?: string | null;
  adresse: string;
  ville: string;
  latitude?: number | null;
  longitude?: number | null;
  type: TerrainType;
  dureeCreneauMinutes?: number;
  equipements?: string[];
};

export type TerrainGestionResume = {
  id: string;
  nom: string;
  ville: string;
  type: TerrainType;
  statut: TerrainStatut;
  nombreFormats: number;
  nombreHoraires: number;
  createdAt: Date;
};

export type TerrainGestionDetail = TerrainBaseInput & {
  id: string;
  statut: TerrainStatut;
  ownerId: string;
  formats: (FormatInput & { id: string })[];
  horaires: (HoraireInput & { id: string })[];
};

/** "YYYY-MM-DD" en heure locale — même convention que le reste du domaine terrains. */
function formatDateLocale(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

export async function listerTerrainsProprietaire(
  ownerId: string
): Promise<TerrainGestionResume[]> {
  const terrains = await prisma.terrain.findMany({
    where: { ownerId },
    include: { _count: { select: { formats: true, horaires: true } } },
    orderBy: { createdAt: "desc" },
  });

  return terrains.map((terrain) => ({
    id: terrain.id,
    nom: terrain.nom,
    ville: terrain.ville,
    type: terrain.type,
    statut: terrain.statut,
    nombreFormats: terrain._count.formats,
    nombreHoraires: terrain._count.horaires,
    createdAt: terrain.createdAt,
  }));
}

export async function trouverTerrainProprietaire(
  id: string,
  ownerId: string
): Promise<TerrainGestionDetail | null> {
  const terrain = await prisma.terrain.findFirst({
    where: { id, ownerId },
    include: { formats: true, horaires: true },
  });
  if (!terrain) return null;

  return {
    id: terrain.id,
    nom: terrain.nom,
    description: terrain.description,
    adresse: terrain.adresse,
    ville: terrain.ville,
    latitude: terrain.latitude,
    longitude: terrain.longitude,
    type: terrain.type,
    dureeCreneauMinutes: terrain.dureeCreneauMinutes,
    equipements: terrain.equipements,
    statut: terrain.statut,
    ownerId: terrain.ownerId as string,
    formats: terrain.formats.map((f) => ({
      id: f.id,
      format: f.format,
      capacite: f.capacite,
      prixParCreneau: f.prixParCreneau,
    })),
    horaires: terrain.horaires.map((h) => ({
      id: h.id,
      jourSemaine: h.jourSemaine,
      ouvre: h.ouvre,
      ferme: h.ferme,
    })),
  };
}

export async function creerTerrain(
  ownerId: string,
  input: TerrainBaseInput & { formats: FormatInput[]; horaires: HoraireInput[] }
): Promise<{ id: string }> {
  const terrain = await prisma.terrain.create({
    data: {
      nom: input.nom,
      description: input.description ?? null,
      adresse: input.adresse,
      ville: input.ville,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      type: input.type,
      dureeCreneauMinutes: input.dureeCreneauMinutes ?? 90,
      equipements: input.equipements ?? [],
      photos: [],
      // Un terrain créé par un propriétaire part en attente de validation —
      // il n'apparaît pas dans la recherche publique (qui ne montre que
      // statut = actif) tant qu'il n'a pas été activé. Aucun flux
      // d'activation n'est construit par ce sous-projet ; c'est un état
      // délibérément en attente d'un futur outil de modération.
      statut: "en_attente",
      ownerId,
      formats: { create: input.formats },
      horaires: { create: input.horaires },
    },
  });
  return { id: terrain.id };
}

async function verifierProprietaire(
  terrainId: string,
  ownerId: string
): Promise<{ ok: true } | { ok: false; raison: "introuvable" | "non_autorise" }> {
  const terrain = await prisma.terrain.findUnique({
    where: { id: terrainId },
    select: { ownerId: true },
  });
  if (!terrain) return { ok: false, raison: "introuvable" };
  if (terrain.ownerId !== ownerId) return { ok: false, raison: "non_autorise" };
  return { ok: true };
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/lib/terrains/gestion.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/terrains/gestion.ts tests/lib/terrains/gestion.test.ts
git commit -m "feat(gestion): add terrain reads and creerTerrain"
```

---

## Task E: `gestion.ts` — `modifierTerrain` + `supprimerTerrain`

**Files:**
- Modify: `src/lib/terrains/gestion.ts`
- Modify: `tests/lib/terrains/gestion.test.ts`

**Interfaces:**
- Consumes: `verifierProprietaire`, `formatDateLocale` from Task D (same file, already private).
- Produces: `ModifierTerrainResultat = {ok:true} | {ok:false, raison:"introuvable"|"non_autorise"}`, `modifierTerrain(terrainId, ownerId, input: TerrainBaseInput): Promise<ModifierTerrainResultat>`; `SupprimerTerrainResultat = {ok:true} | {ok:false, raison:"introuvable"|"non_autorise"|"reservations_actives"}`, `supprimerTerrain(terrainId, ownerId, maintenant?: Date): Promise<SupprimerTerrainResultat>`. Consumed by Task I's API route.

- [ ] **Step 1: Add failing tests**

In `tests/lib/terrains/gestion.test.ts`, add the import of the two new functions (extend the existing `import { ... } from "@/lib/terrains/gestion";` line):

```ts
import {
  listerTerrainsProprietaire,
  trouverTerrainProprietaire,
  creerTerrain,
  modifierTerrain,
  supprimerTerrain,
} from "@/lib/terrains/gestion";
```

Then add these two `describe` blocks right after the closing `});` of the `describe("creerTerrain / listerTerrainsProprietaire / trouverTerrainProprietaire", ...)` block, still inside the outer `describe("gestion des terrains propriétaire", ...)`:

```ts
  describe("modifierTerrain", () => {
    it("updates the terrain's base fields for its owner", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await modifierTerrain(id, owner.id, { ...inputBase, nom: "Nouveau nom" });
      expect(resultat).toEqual({ ok: true });

      const terrain = await prisma.terrain.findUnique({ where: { id } });
      expect(terrain?.nom).toBe("Nouveau nom");
    });

    it("refuses to update a terrain owned by someone else", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await modifierTerrain(id, other.id, inputBase);
      expect(resultat).toEqual({ ok: false, raison: "non_autorise" });
    });

    it("returns introuvable for a non-existent terrain", async () => {
      const owner = await creerProprietaire();
      const resultat = await modifierTerrain("inexistant", owner.id, inputBase);
      expect(resultat).toEqual({ ok: false, raison: "introuvable" });
    });
  });

  describe("supprimerTerrain", () => {
    it("deletes a terrain with no active reservation or match", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await supprimerTerrain(id, owner.id);
      expect(resultat).toEqual({ ok: true });
      expect(await prisma.terrain.findUnique({ where: { id } })).toBeNull();
    });

    it("refuses to delete a terrain owned by someone else", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      expect(await supprimerTerrain(id, other.id)).toEqual({ ok: false, raison: "non_autorise" });
    });

    it("refuses to delete a terrain with a confirmed future reservation", async () => {
      const owner = await creerProprietaire();
      const player = await prisma.user.create({
        data: {
          email: "joueur@example.com",
          passwordHash: await hashPassword("motdepasse123"),
          profile: { create: { prenom: "J", ville: "Tunis" } },
        },
      });
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      await prisma.reservation.create({
        data: { terrainId: id, userId: player.id, date: "2099-01-01", heureDebut: "10:00", heureFin: "11:30" },
      });

      const resultat = await supprimerTerrain(id, owner.id, new Date("2026-01-01"));
      expect(resultat).toEqual({ ok: false, raison: "reservations_actives" });
      expect(await prisma.terrain.findUnique({ where: { id } })).not.toBeNull();
    });

    it("allows deleting a terrain whose only reservation is in the past", async () => {
      const owner = await creerProprietaire();
      const player = await prisma.user.create({
        data: {
          email: "joueur2@example.com",
          passwordHash: await hashPassword("motdepasse123"),
          profile: { create: { prenom: "J", ville: "Tunis" } },
        },
      });
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      await prisma.reservation.create({
        data: { terrainId: id, userId: player.id, date: "2020-01-01", heureDebut: "10:00", heureFin: "11:30" },
      });

      const resultat = await supprimerTerrain(id, owner.id, new Date("2026-01-01"));
      expect(resultat).toEqual({ ok: true });
    });
  });
```

- [ ] **Step 2: Run the test file, confirm the new tests fail**

Run: `npx vitest run tests/lib/terrains/gestion.test.ts`
Expected: FAIL — `modifierTerrain`/`supprimerTerrain` are not exported yet.

- [ ] **Step 3: Append the two functions to `src/lib/terrains/gestion.ts`**

Add at the end of the file (after `verifierProprietaire`):

```ts

export type ModifierTerrainResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" };

export async function modifierTerrain(
  terrainId: string,
  ownerId: string,
  input: TerrainBaseInput
): Promise<ModifierTerrainResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  await prisma.terrain.update({
    where: { id: terrainId },
    data: {
      nom: input.nom,
      description: input.description ?? null,
      adresse: input.adresse,
      ville: input.ville,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      type: input.type,
      dureeCreneauMinutes: input.dureeCreneauMinutes ?? 90,
      equipements: input.equipements ?? [],
    },
  });
  return { ok: true };
}

export type SupprimerTerrainResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" | "reservations_actives" };

/**
 * Supprime un terrain. Refuse si des réservations confirmées ou des matchs
 * ouverts/complets à venir y sont encore attachés : Reservation.terrainId et
 * Match.terrainId sont `onDelete: Cascade` dans le schéma, donc supprimer le
 * terrain les supprimerait silencieusement avec lui — un vrai propriétaire
 * ne doit pas pouvoir effacer des réservations de joueurs de cette façon.
 */
export async function supprimerTerrain(
  terrainId: string,
  ownerId: string,
  maintenant: Date = new Date()
): Promise<SupprimerTerrainResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  const dateStr = formatDateLocale(maintenant);
  const [reservationActive, matchActif] = await Promise.all([
    prisma.reservation.findFirst({
      where: { terrainId, statut: "confirmee", date: { gte: dateStr } },
      select: { id: true },
    }),
    prisma.match.findFirst({
      where: { terrainId, statut: { in: ["ouvert", "complet"] }, date: { gte: dateStr } },
      select: { id: true },
    }),
  ]);
  if (reservationActive || matchActif) {
    return { ok: false, raison: "reservations_actives" };
  }

  await prisma.terrain.delete({ where: { id: terrainId } });
  return { ok: true };
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/lib/terrains/gestion.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/terrains/gestion.ts tests/lib/terrains/gestion.test.ts
git commit -m "feat(gestion): add modifierTerrain and supprimerTerrain"
```

---

## Task F: `gestion.ts` — format CRUD (`ajouterFormat`/`modifierFormat`/`supprimerFormat`)

**Files:**
- Modify: `src/lib/terrains/gestion.ts`
- Modify: `tests/lib/terrains/gestion.test.ts`

**Interfaces:**
- Consumes: `verifierProprietaire` from Task D.
- Produces: `AjouterFormatResultat = {ok:true, id:string} | {ok:false, raison:"introuvable"|"non_autorise"|"format_existe"}`, `ajouterFormat(terrainId, ownerId, input: FormatInput): Promise<AjouterFormatResultat>`; `ModifierFormatResultat = {ok:true} | {ok:false, raison:"introuvable"|"non_autorise"}`, `modifierFormat(terrainId, ownerId, formatId, input: {capacite:number; prixParCreneau:number}): Promise<ModifierFormatResultat>`; `SupprimerFormatResultat = {ok:true} | {ok:false, raison:"introuvable"|"non_autorise"|"dernier_format"}`, `supprimerFormat(terrainId, ownerId, formatId): Promise<SupprimerFormatResultat>`. Consumed by Task J's API routes.

- [ ] **Step 1: Add failing tests**

In `tests/lib/terrains/gestion.test.ts`, extend the import line once more:

```ts
import {
  listerTerrainsProprietaire,
  trouverTerrainProprietaire,
  creerTerrain,
  modifierTerrain,
  supprimerTerrain,
  ajouterFormat,
  modifierFormat,
  supprimerFormat,
} from "@/lib/terrains/gestion";
```

Add this `describe` block right after the closing `});` of `describe("supprimerTerrain", ...)`, still inside the outer `describe`:

```ts
  describe("ajouterFormat / modifierFormat / supprimerFormat", () => {
    it("adds a new format offer", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await ajouterFormat(id, owner.id, { format: "sept", capacite: 14, prixParCreneau: 80000 });
      expect(resultat.ok).toBe(true);
      const count = await prisma.terrainFormatOffre.count({ where: { terrainId: id } });
      expect(count).toBe(2);
    });

    it("refuses a duplicate format on the same terrain", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await ajouterFormat(id, owner.id, formatValide);
      expect(resultat).toEqual({ ok: false, raison: "format_existe" });
    });

    it("refuses to add a format for another owner's terrain", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await ajouterFormat(id, other.id, { format: "sept", capacite: 14, prixParCreneau: 80000 });
      expect(resultat).toEqual({ ok: false, raison: "non_autorise" });
    });

    it("updates a format's capacite and prix", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id } });

      const resultat = await modifierFormat(id, owner.id, format.id, { capacite: 12, prixParCreneau: 65000 });
      expect(resultat).toEqual({ ok: true });
      const updated = await prisma.terrainFormatOffre.findUnique({ where: { id: format.id } });
      expect(updated?.capacite).toBe(12);
      expect(updated?.prixParCreneau).toBe(65000);
    });

    it("refuses to modify a format belonging to another owner's terrain", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id } });

      const resultat = await modifierFormat(id, other.id, format.id, { capacite: 12, prixParCreneau: 65000 });
      expect(resultat).toEqual({ ok: false, raison: "non_autorise" });
    });

    it("deletes a format when more than one remains", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, {
        ...inputBase,
        formats: [formatValide, { format: "sept", capacite: 14, prixParCreneau: 80000 }],
        horaires: [horaireValide],
      });
      const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id, format: "cinq" } });

      const resultat = await supprimerFormat(id, owner.id, format.id);
      expect(resultat).toEqual({ ok: true });
      const count = await prisma.terrainFormatOffre.count({ where: { terrainId: id } });
      expect(count).toBe(1);
    });

    it("refuses to delete the last remaining format", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });
      const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id } });

      const resultat = await supprimerFormat(id, owner.id, format.id);
      expect(resultat).toEqual({ ok: false, raison: "dernier_format" });
      const count = await prisma.terrainFormatOffre.count({ where: { terrainId: id } });
      expect(count).toBe(1);
    });
  });
```

- [ ] **Step 2: Run the test file, confirm the new tests fail**

Run: `npx vitest run tests/lib/terrains/gestion.test.ts`
Expected: FAIL — the three functions are not exported yet.

- [ ] **Step 3: Append the three functions to `src/lib/terrains/gestion.ts`**

Add at the end of the file:

```ts

export type AjouterFormatResultat =
  | { ok: true; id: string }
  | { ok: false; raison: "introuvable" | "non_autorise" | "format_existe" };

export async function ajouterFormat(
  terrainId: string,
  ownerId: string,
  input: FormatInput
): Promise<AjouterFormatResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  const existant = await prisma.terrainFormatOffre.findUnique({
    where: { terrainId_format: { terrainId, format: input.format } },
  });
  if (existant) return { ok: false, raison: "format_existe" };

  const created = await prisma.terrainFormatOffre.create({
    data: {
      terrainId,
      format: input.format,
      capacite: input.capacite,
      prixParCreneau: input.prixParCreneau,
    },
  });
  return { ok: true, id: created.id };
}

export type ModifierFormatResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" };

export async function modifierFormat(
  terrainId: string,
  ownerId: string,
  formatId: string,
  input: { capacite: number; prixParCreneau: number }
): Promise<ModifierFormatResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  const format = await prisma.terrainFormatOffre.findFirst({
    where: { id: formatId, terrainId },
  });
  if (!format) return { ok: false, raison: "introuvable" };

  await prisma.terrainFormatOffre.update({
    where: { id: formatId },
    data: { capacite: input.capacite, prixParCreneau: input.prixParCreneau },
  });
  return { ok: true };
}

export type SupprimerFormatResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" | "dernier_format" };

/** Un terrain doit toujours garder au moins un format — le dernier ne peut pas être retiré. */
export async function supprimerFormat(
  terrainId: string,
  ownerId: string,
  formatId: string
): Promise<SupprimerFormatResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  const format = await prisma.terrainFormatOffre.findFirst({
    where: { id: formatId, terrainId },
  });
  if (!format) return { ok: false, raison: "introuvable" };

  const total = await prisma.terrainFormatOffre.count({ where: { terrainId } });
  if (total <= 1) return { ok: false, raison: "dernier_format" };

  await prisma.terrainFormatOffre.delete({ where: { id: formatId } });
  return { ok: true };
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/lib/terrains/gestion.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/terrains/gestion.ts tests/lib/terrains/gestion.test.ts
git commit -m "feat(gestion): add format offer CRUD"
```

---

## Task G: `gestion.ts` — `modifierHoraires`

**Files:**
- Modify: `src/lib/terrains/gestion.ts`
- Modify: `tests/lib/terrains/gestion.test.ts`

**Interfaces:**
- Consumes: `verifierProprietaire` from Task D.
- Produces: `ModifierHorairesResultat = {ok:true} | {ok:false, raison:"introuvable"|"non_autorise"}`, `modifierHoraires(terrainId, ownerId, horaires: HoraireInput[]): Promise<ModifierHorairesResultat>`. Consumed by Task K's API route. This is the last function added to `gestion.ts` — the file is now complete for the rest of the plan.

- [ ] **Step 1: Add failing tests**

In `tests/lib/terrains/gestion.test.ts`, extend the import line a final time:

```ts
import {
  listerTerrainsProprietaire,
  trouverTerrainProprietaire,
  creerTerrain,
  modifierTerrain,
  supprimerTerrain,
  ajouterFormat,
  modifierFormat,
  supprimerFormat,
  modifierHoraires,
} from "@/lib/terrains/gestion";
```

Add this `describe` block right after the closing `});` of `describe("ajouterFormat / modifierFormat / supprimerFormat", ...)`, still inside the outer `describe`, followed by the outer `describe`'s own closing `});`:

```ts
  describe("modifierHoraires", () => {
    it("replaces the terrain's horaires with the new set", async () => {
      const owner = await creerProprietaire();
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await modifierHoraires(id, owner.id, [
        { jourSemaine: 0, ouvre: "09:00", ferme: "12:00" },
        { jourSemaine: 0, ouvre: "16:00", ferme: "20:00" },
      ]);
      expect(resultat).toEqual({ ok: true });

      const horaires = await prisma.terrainHoraire.findMany({ where: { terrainId: id } });
      expect(horaires).toHaveLength(2);
      expect(horaires.every((h) => h.jourSemaine === 0)).toBe(true);
    });

    it("refuses to modify horaires for another owner's terrain", async () => {
      const owner = await creerProprietaire("a@example.com");
      const other = await creerProprietaire("b@example.com");
      const { id } = await creerTerrain(owner.id, { ...inputBase, formats: [formatValide], horaires: [horaireValide] });

      const resultat = await modifierHoraires(id, other.id, [horaireValide]);
      expect(resultat).toEqual({ ok: false, raison: "non_autorise" });
    });

    it("returns introuvable for a non-existent terrain", async () => {
      const owner = await creerProprietaire();
      const resultat = await modifierHoraires("inexistant", owner.id, [horaireValide]);
      expect(resultat).toEqual({ ok: false, raison: "introuvable" });
    });
  });
```

- [ ] **Step 2: Run the test file, confirm the new tests fail**

Run: `npx vitest run tests/lib/terrains/gestion.test.ts`
Expected: FAIL — `modifierHoraires` is not exported yet.

- [ ] **Step 3: Append the function to `src/lib/terrains/gestion.ts`**

Add at the end of the file:

```ts

export type ModifierHorairesResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" };

/** Remplace intégralement les horaires du terrain par le nouvel ensemble fourni. */
export async function modifierHoraires(
  terrainId: string,
  ownerId: string,
  horaires: HoraireInput[]
): Promise<ModifierHorairesResultat> {
  const verif = await verifierProprietaire(terrainId, ownerId);
  if (!verif.ok) return verif;

  await prisma.$transaction([
    prisma.terrainHoraire.deleteMany({ where: { terrainId } }),
    prisma.terrainHoraire.createMany({
      data: horaires.map((h) => ({
        terrainId,
        jourSemaine: h.jourSemaine,
        ouvre: h.ouvre,
        ferme: h.ferme,
      })),
    }),
  ]);
  return { ok: true };
}
```

- [ ] **Step 4: Run the full test file, confirm it passes**

Run: `npx vitest run tests/lib/terrains/gestion.test.ts`
Expected: all tests PASS (this is the complete `gestion.ts` test suite — every function from Tasks D–G).

- [ ] **Step 5: Commit**

```bash
git add src/lib/terrains/gestion.ts tests/lib/terrains/gestion.test.ts
git commit -m "feat(gestion): add modifierHoraires"
```

---

## Task H: `POST /api/proprietaire/terrains`

**Files:**
- Create: `src/app/api/proprietaire/terrains/route.ts`
- Create: `tests/api/proprietaire-terrains.test.ts`

**Interfaces:**
- Consumes: `requireRole` (`src/lib/auth/authorization.ts`), `creerTerrainSchema` (Task C), `creerTerrain` (Task D).
- Produces: `POST /api/proprietaire/terrains` — 201 `{id}` on success, 400 field errors, 401/403 from `requireRole`. Consumed by Task N's `CreerTerrainForm`.

- [ ] **Step 1: Write the test file**

Create `tests/api/proprietaire-terrains.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST } from "@/app/api/proprietaire/terrains/route";

async function creerUtilisateur(email: string, role: "joueur" | "proprietaire" = "proprietaire") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

function creerRequest(body: unknown) {
  return new Request("http://localhost/api/proprietaire/terrains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const payloadValide = {
  nom: "Terrain Test",
  adresse: "Rue Test",
  ville: "Tunis",
  type: "gazon_synthetique",
  formats: [{ format: "cinq", capacite: 10, prixParCreneau: 60000 }],
  horaires: [{ jourSemaine: 1, ouvre: "08:00", ferme: "22:00" }],
};

describe("POST /api/proprietaire/terrains", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await POST(creerRequest(payloadValide));
    expect(response.status).toBe(401);
  });

  it("returns 403 for a joueur session", async () => {
    const user = await creerUtilisateur("joueur@example.com", "joueur");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id, role: "joueur" } } as never);

    const response = await POST(creerRequest(payloadValide));
    expect(response.status).toBe(403);
  });

  it("creates a terrain owned by the calling proprietaire", async () => {
    const owner = await creerUtilisateur("owner@example.com", "proprietaire");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await POST(creerRequest(payloadValide));
    expect(response.status).toBe(201);
    const body = await response.json();
    const terrain = await prisma.terrain.findUnique({ where: { id: body.id } });
    expect(terrain?.ownerId).toBe(owner.id);
    expect(terrain?.statut).toBe("en_attente");
  });

  it("rejects a payload with no formats", async () => {
    const owner = await creerUtilisateur("owner2@example.com", "proprietaire");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await POST(creerRequest({ ...payloadValide, formats: [] }));
    expect(response.status).toBe(400);
  });

  it("returns 400 instead of throwing on malformed JSON", async () => {
    const owner = await creerUtilisateur("owner3@example.com", "proprietaire");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await POST(
      new Request("http://localhost/api/proprietaire/terrains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ not valid json",
      })
    );
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails**

Run: `npx vitest run tests/api/proprietaire-terrains.test.ts`
Expected: FAIL — cannot resolve `@/app/api/proprietaire/terrains/route`.

- [ ] **Step 3: Write `src/app/api/proprietaire/terrains/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { creerTerrainSchema } from "@/lib/validation/proprietaire";
import { creerTerrain } from "@/lib/terrains/gestion";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = creerTerrainSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const terrain = await creerTerrain(session.user.id, parsed.data);
  return NextResponse.json({ id: terrain.id }, { status: 201 });
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/api/proprietaire-terrains.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/proprietaire/terrains/route.ts tests/api/proprietaire-terrains.test.ts
git commit -m "feat(api): add POST /api/proprietaire/terrains"
```

---

## Task I: `PATCH`/`DELETE /api/proprietaire/terrains/[id]`

**Files:**
- Create: `src/app/api/proprietaire/terrains/[id]/route.ts`
- Create: `tests/api/proprietaire-terrains-id.test.ts`

**Interfaces:**
- Consumes: `requireRole`, `modifierTerrainSchema` (Task C), `modifierTerrain`/`supprimerTerrain` (Task E).
- Produces: `PATCH /api/proprietaire/terrains/[id]` (200/400/401/403/404), `DELETE /api/proprietaire/terrains/[id]` (200/401/403/404/409). Consumed by Task O's `ModifierTerrainForm` and `SupprimerTerrainButton`.

- [ ] **Step 1: Write the test file**

Create `tests/api/proprietaire-terrains-id.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { creerTerrain } from "@/lib/terrains/gestion";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { PATCH, DELETE } from "@/app/api/proprietaire/terrains/[id]/route";

async function creerUtilisateur(email: string, role: "joueur" | "proprietaire" = "proprietaire") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

function creerRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/proprietaire/terrains/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const inputBase = {
  nom: "Terrain Test",
  adresse: "Rue Test",
  ville: "Tunis",
  type: "gazon_synthetique" as const,
  formats: [{ format: "cinq" as const, capacite: 10, prixParCreneau: 60000 }],
  horaires: [{ jourSemaine: 1, ouvre: "08:00", ferme: "22:00" }],
};

describe("PATCH /api/proprietaire/terrains/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await PATCH(creerRequest("PATCH", inputBase), { params: Promise.resolve({ id: "x" }) });
    expect(response.status).toBe(401);
  });

  it("updates the terrain for its owner", async () => {
    const owner = await creerUtilisateur("owner@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PATCH(
      creerRequest("PATCH", { ...inputBase, nom: "Nom modifié" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(200);
    const terrain = await prisma.terrain.findUnique({ where: { id } });
    expect(terrain?.nom).toBe("Nom modifié");
  });

  it("returns 403 when the terrain belongs to someone else", async () => {
    const owner = await creerUtilisateur("owner2@example.com");
    const other = await creerUtilisateur("other@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: other.id, role: "proprietaire" } } as never);

    const response = await PATCH(creerRequest("PATCH", inputBase), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(403);
  });

  it("returns 404 for a non-existent terrain", async () => {
    const owner = await creerUtilisateur("owner3@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PATCH(creerRequest("PATCH", inputBase), { params: Promise.resolve({ id: "inexistant" }) });
    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid payload", async () => {
    const owner = await creerUtilisateur("owner4@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PATCH(creerRequest("PATCH", { ...inputBase, nom: "" }), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/proprietaire/terrains/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deletes the terrain for its owner", async () => {
    const owner = await creerUtilisateur("owner5@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await DELETE(creerRequest("DELETE"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200);
    expect(await prisma.terrain.findUnique({ where: { id } })).toBeNull();
  });

  it("returns 409 when the terrain has an active future reservation", async () => {
    const owner = await creerUtilisateur("owner6@example.com");
    const player = await creerUtilisateur("player@example.com", "joueur");
    const { id } = await creerTerrain(owner.id, inputBase);
    await prisma.reservation.create({
      data: { terrainId: id, userId: player.id, date: "2099-01-01", heureDebut: "10:00", heureFin: "11:30" },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await DELETE(creerRequest("DELETE"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(409);
    expect(await prisma.terrain.findUnique({ where: { id } })).not.toBeNull();
  });

  it("returns 403 when the terrain belongs to someone else", async () => {
    const owner = await creerUtilisateur("owner7@example.com");
    const other = await creerUtilisateur("other2@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: other.id, role: "proprietaire" } } as never);

    const response = await DELETE(creerRequest("DELETE"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails**

Run: `npx vitest run tests/api/proprietaire-terrains-id.test.ts`
Expected: FAIL — cannot resolve `@/app/api/proprietaire/terrains/[id]/route`.

- [ ] **Step 3: Write `src/app/api/proprietaire/terrains/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { modifierTerrainSchema } from "@/lib/validation/proprietaire";
import { modifierTerrain, supprimerTerrain } from "@/lib/terrains/gestion";

function statutPour(raison: "introuvable" | "non_autorise" | "reservations_actives"): number {
  if (raison === "introuvable") return 404;
  if (raison === "non_autorise") return 403;
  return 409;
}

function messagePour(raison: "introuvable" | "non_autorise" | "reservations_actives"): string {
  if (raison === "introuvable") return "Terrain introuvable";
  if (raison === "non_autorise") return "Vous n'êtes pas le propriétaire de ce terrain";
  return "Impossible de supprimer ce terrain : des réservations ou des matchs à venir y sont encore rattachés";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id } = await context.params;
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = modifierTerrainSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await modifierTerrain(id, session.user.id, parsed.data);
  if (!resultat.ok) {
    return NextResponse.json({ error: messagePour(resultat.raison) }, { status: statutPour(resultat.raison) });
  }

  return NextResponse.json({ message: "Terrain mis à jour." });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id } = await context.params;
  const resultat = await supprimerTerrain(id, session.user.id);
  if (!resultat.ok) {
    return NextResponse.json({ error: messagePour(resultat.raison) }, { status: statutPour(resultat.raison) });
  }

  return NextResponse.json({ message: "Terrain supprimé." });
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/api/proprietaire-terrains-id.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/proprietaire/terrains/[id]/route.ts" tests/api/proprietaire-terrains-id.test.ts
git commit -m "feat(api): add PATCH/DELETE /api/proprietaire/terrains/[id]"
```

---

## Task J: Format API routes

**Files:**
- Create: `src/app/api/proprietaire/terrains/[id]/formats/route.ts`
- Create: `src/app/api/proprietaire/terrains/[id]/formats/[formatId]/route.ts`
- Create: `tests/api/proprietaire-terrains-formats.test.ts`

**Interfaces:**
- Consumes: `requireRole`, `ajouterFormatSchema`/`modifierFormatSchema` (Task C), `ajouterFormat`/`modifierFormat`/`supprimerFormat` (Task F).
- Produces: `POST /api/proprietaire/terrains/[id]/formats` (201/400/401/403/404/409), `PATCH`/`DELETE /api/proprietaire/terrains/[id]/formats/[formatId]` (200/400/401/403/404/409). Consumed by Task P's `FormatsManager`.

- [ ] **Step 1: Write the test file**

Create `tests/api/proprietaire-terrains-formats.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { creerTerrain } from "@/lib/terrains/gestion";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST } from "@/app/api/proprietaire/terrains/[id]/formats/route";
import { PATCH, DELETE } from "@/app/api/proprietaire/terrains/[id]/formats/[formatId]/route";

async function creerUtilisateur(email: string, role: "joueur" | "proprietaire" = "proprietaire") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

function creerRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const inputBase = {
  nom: "Terrain Test",
  adresse: "Rue Test",
  ville: "Tunis",
  type: "gazon_synthetique" as const,
  formats: [{ format: "cinq" as const, capacite: 10, prixParCreneau: 60000 }],
  horaires: [{ jourSemaine: 1, ouvre: "08:00", ferme: "22:00" }],
};

describe("POST /api/proprietaire/terrains/[id]/formats", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("adds a new format for the owner", async () => {
    const owner = await creerUtilisateur("owner@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await POST(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/formats`, "POST", {
        format: "sept",
        capacite: 14,
        prixParCreneau: 80000,
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(201);
    const count = await prisma.terrainFormatOffre.count({ where: { terrainId: id } });
    expect(count).toBe(2);
  });

  it("returns 409 for a duplicate format", async () => {
    const owner = await creerUtilisateur("owner2@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await POST(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/formats`, "POST", {
        format: "cinq",
        capacite: 10,
        prixParCreneau: 60000,
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(409);
  });

  it("returns 403 for someone else's terrain", async () => {
    const owner = await creerUtilisateur("owner3@example.com");
    const other = await creerUtilisateur("other@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: other.id, role: "proprietaire" } } as never);

    const response = await POST(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/formats`, "POST", {
        format: "sept",
        capacite: 14,
        prixParCreneau: 80000,
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(403);
  });
});

describe("PATCH/DELETE /api/proprietaire/terrains/[id]/formats/[formatId]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates a format's capacite/prix for the owner", async () => {
    const owner = await creerUtilisateur("owner4@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id } });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PATCH(
      creerRequest(
        `http://localhost/api/proprietaire/terrains/${id}/formats/${format.id}`,
        "PATCH",
        { capacite: 12, prixParCreneau: 65000 }
      ),
      { params: Promise.resolve({ id, formatId: format.id }) }
    );
    expect(response.status).toBe(200);
    const updated = await prisma.terrainFormatOffre.findUnique({ where: { id: format.id } });
    expect(updated?.capacite).toBe(12);
  });

  it("deletes a format when more than one remains", async () => {
    const owner = await creerUtilisateur("owner5@example.com");
    const { id } = await creerTerrain(owner.id, {
      ...inputBase,
      formats: [
        { format: "cinq", capacite: 10, prixParCreneau: 60000 },
        { format: "sept", capacite: 14, prixParCreneau: 80000 },
      ],
    });
    const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id, format: "cinq" } });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await DELETE(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/formats/${format.id}`, "DELETE"),
      { params: Promise.resolve({ id, formatId: format.id }) }
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 when deleting the last remaining format", async () => {
    const owner = await creerUtilisateur("owner6@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id } });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await DELETE(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/formats/${format.id}`, "DELETE"),
      { params: Promise.resolve({ id, formatId: format.id }) }
    );
    expect(response.status).toBe(409);
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails**

Run: `npx vitest run tests/api/proprietaire-terrains-formats.test.ts`
Expected: FAIL — cannot resolve the two route modules.

- [ ] **Step 3: Write `src/app/api/proprietaire/terrains/[id]/formats/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { ajouterFormatSchema } from "@/lib/validation/proprietaire";
import { ajouterFormat } from "@/lib/terrains/gestion";

function statutPour(raison: "introuvable" | "non_autorise" | "format_existe"): number {
  if (raison === "introuvable") return 404;
  if (raison === "non_autorise") return 403;
  return 409;
}

function messagePour(raison: "introuvable" | "non_autorise" | "format_existe"): string {
  if (raison === "introuvable") return "Terrain introuvable";
  if (raison === "non_autorise") return "Vous n'êtes pas le propriétaire de ce terrain";
  return "Ce format existe déjà pour ce terrain";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id } = await context.params;
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = ajouterFormatSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await ajouterFormat(id, session.user.id, parsed.data);
  if (!resultat.ok) {
    return NextResponse.json({ error: messagePour(resultat.raison) }, { status: statutPour(resultat.raison) });
  }

  return NextResponse.json({ id: resultat.id }, { status: 201 });
}
```

- [ ] **Step 4: Write `src/app/api/proprietaire/terrains/[id]/formats/[formatId]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { modifierFormatSchema } from "@/lib/validation/proprietaire";
import { modifierFormat, supprimerFormat } from "@/lib/terrains/gestion";

function statutPour(raison: "introuvable" | "non_autorise" | "dernier_format"): number {
  if (raison === "introuvable") return 404;
  if (raison === "non_autorise") return 403;
  return 409;
}

function messagePour(raison: "introuvable" | "non_autorise" | "dernier_format"): string {
  if (raison === "introuvable") return "Format introuvable";
  if (raison === "non_autorise") return "Vous n'êtes pas le propriétaire de ce terrain";
  return "Impossible de supprimer le dernier format d'un terrain";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; formatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id, formatId } = await context.params;
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = modifierFormatSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await modifierFormat(id, session.user.id, formatId, parsed.data);
  if (!resultat.ok) {
    return NextResponse.json({ error: messagePour(resultat.raison) }, { status: statutPour(resultat.raison) });
  }

  return NextResponse.json({ message: "Format mis à jour." });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; formatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id, formatId } = await context.params;
  const resultat = await supprimerFormat(id, session.user.id, formatId);
  if (!resultat.ok) {
    return NextResponse.json({ error: messagePour(resultat.raison) }, { status: statutPour(resultat.raison) });
  }

  return NextResponse.json({ message: "Format supprimé." });
}
```

- [ ] **Step 5: Run the test file, confirm it passes**

Run: `npx vitest run tests/api/proprietaire-terrains-formats.test.ts`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/api/proprietaire/terrains/[id]/formats" tests/api/proprietaire-terrains-formats.test.ts
git commit -m "feat(api): add format offer routes"
```

---

## Task K: `PUT /api/proprietaire/terrains/[id]/horaires`

**Files:**
- Create: `src/app/api/proprietaire/terrains/[id]/horaires/route.ts`
- Create: `tests/api/proprietaire-terrains-horaires.test.ts`

**Interfaces:**
- Consumes: `requireRole`, `modifierHorairesSchema` (Task C), `modifierHoraires` (Task G).
- Produces: `PUT /api/proprietaire/terrains/[id]/horaires` (200/400/401/403/404). Consumed by Task Q's `HorairesManager`.

- [ ] **Step 1: Write the test file**

Create `tests/api/proprietaire-terrains-horaires.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { creerTerrain } from "@/lib/terrains/gestion";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { PUT } from "@/app/api/proprietaire/terrains/[id]/horaires/route";

async function creerUtilisateur(email: string, role: "joueur" | "proprietaire" = "proprietaire") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

function creerRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const inputBase = {
  nom: "Terrain Test",
  adresse: "Rue Test",
  ville: "Tunis",
  type: "gazon_synthetique" as const,
  formats: [{ format: "cinq" as const, capacite: 10, prixParCreneau: 60000 }],
  horaires: [{ jourSemaine: 1, ouvre: "08:00", ferme: "22:00" }],
};

describe("PUT /api/proprietaire/terrains/[id]/horaires", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("replaces the terrain's horaires for its owner", async () => {
    const owner = await creerUtilisateur("owner@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PUT(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/horaires`, {
        horaires: [
          { jourSemaine: 0, ouvre: "09:00", ferme: "12:00" },
          { jourSemaine: 0, ouvre: "16:00", ferme: "20:00" },
        ],
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(200);
    const horaires = await prisma.terrainHoraire.findMany({ where: { terrainId: id } });
    expect(horaires).toHaveLength(2);
  });

  it("rejects an empty horaires array", async () => {
    const owner = await creerUtilisateur("owner2@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PUT(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/horaires`, { horaires: [] }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 403 for someone else's terrain", async () => {
    const owner = await creerUtilisateur("owner3@example.com");
    const other = await creerUtilisateur("other@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: other.id, role: "proprietaire" } } as never);

    const response = await PUT(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/horaires`, {
        horaires: [{ jourSemaine: 0, ouvre: "09:00", ferme: "12:00" }],
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 for a non-existent terrain", async () => {
    const owner = await creerUtilisateur("owner4@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PUT(
      creerRequest(`http://localhost/api/proprietaire/terrains/inexistant/horaires`, {
        horaires: [{ jourSemaine: 0, ouvre: "09:00", ferme: "12:00" }],
      }),
      { params: Promise.resolve({ id: "inexistant" }) }
    );
    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails**

Run: `npx vitest run tests/api/proprietaire-terrains-horaires.test.ts`
Expected: FAIL — cannot resolve the route module.

- [ ] **Step 3: Write `src/app/api/proprietaire/terrains/[id]/horaires/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { modifierHorairesSchema } from "@/lib/validation/proprietaire";
import { modifierHoraires } from "@/lib/terrains/gestion";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id } = await context.params;
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = modifierHorairesSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await modifierHoraires(id, session.user.id, parsed.data.horaires);
  if (!resultat.ok) {
    const status = resultat.raison === "introuvable" ? 404 : 403;
    const message =
      resultat.raison === "introuvable"
        ? "Terrain introuvable"
        : "Vous n'êtes pas le propriétaire de ce terrain";
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ message: "Horaires mis à jour." });
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/api/proprietaire-terrains-horaires.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/proprietaire/terrains/[id]/horaires" tests/api/proprietaire-terrains-horaires.test.ts
git commit -m "feat(api): add PUT /api/proprietaire/terrains/[id]/horaires"
```

---

## Task L: Dashboard page + profil link

**Files:**
- Create: `src/app/proprietaire/page.tsx`
- Modify: `src/app/profil/page.tsx`

**Interfaces:**
- Consumes: `requireRole` (`src/lib/auth/authorization.ts`), `listerTerrainsProprietaire` (Task D).
- Produces: `/proprietaire` dashboard route. No other task depends on this page's internals; it's a leaf.

No dedicated automated test exists for this task — this codebase has no page-level test convention (only API routes, `lib` functions, and client components are unit-tested; confirmed by the absence of any `tests/app/**` directory). Verification for this task is `npx tsc --noEmit` plus visual confirmation via `npm run build` at the end of the plan.

- [ ] **Step 1: Write `src/app/proprietaire/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { listerTerrainsProprietaire } from "@/lib/terrains/gestion";

export default async function ProprietaireDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    redirect("/");
  }

  const terrains = await listerTerrainsProprietaire(session.user.id);
  const actifs = terrains.filter((t) => t.statut === "actif").length;
  const enAttente = terrains.filter((t) => t.statut === "en_attente").length;
  const suspendus = terrains.filter((t) => t.statut === "suspendu").length;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10">
      <h1 className="text-xl font-semibold text-anthracite">Espace propriétaire</h1>
      <p className="mt-2 text-gray-600">Bienvenue {session.user.email}.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-anthracite">{terrains.length}</p>
          <p className="text-xs text-gray-600">Terrain{terrains.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-primary">{actifs}</p>
          <p className="text-xs text-gray-600">Actif{actifs > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-500">{enAttente + suspendus}</p>
          <p className="text-xs text-gray-600">En attente / suspendu</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/proprietaire/terrains"
          className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark"
        >
          Gérer mes terrains
        </Link>
        <Link
          href="/proprietaire/terrains/nouveau"
          className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-primary/5"
        >
          Ajouter un terrain
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Add a conditional link from `/profil`**

In `src/app/profil/page.tsx`, add the `Link` import (the file currently imports `redirect`, `getServerSession`, `authOptions`, `prisma`, `ProfilForm`, `DeconnexionButton` — add this as a new import line among them):

```tsx
import Link from "next/link";
```

Then change:

```tsx
        <div className="px-4 pb-6">
          <DeconnexionButton />
        </div>
```

to:

```tsx
        <div className="px-4 pb-6">
          {session.user.role === "proprietaire" && (
            <Link
              href="/proprietaire"
              className="mb-3 block rounded-lg border border-primary px-4 py-3 text-center font-semibold text-primary transition hover:bg-primary/5"
            >
              Gérer mes terrains
            </Link>
          )}
          <DeconnexionButton />
        </div>
```

- [ ] **Step 3: Verify with tsc**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/proprietaire/page.tsx src/app/profil/page.tsx
git commit -m "feat(proprietaire): add dashboard page and profil entry point"
```

---

## Task M: Terrains list page + `TerrainGestionCard`

**Files:**
- Create: `src/components/proprietaire/TerrainGestionCard.tsx`
- Create: `src/app/proprietaire/terrains/page.tsx`
- Create: `tests/components/TerrainGestionCard.test.tsx`

**Interfaces:**
- Consumes: `libelleType` (`src/lib/terrains/format.ts`, existing read-only reference), `listerTerrainsProprietaire` (Task D).
- Produces: `TerrainGestionCard({terrain: {id, nom, ville, type, statut, nombreFormats, nombreHoraires}})` component, `/proprietaire/terrains` list route.

- [ ] **Step 1: Write the component test file**

Create `tests/components/TerrainGestionCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerrainGestionCard } from "@/components/proprietaire/TerrainGestionCard";

const terrainBase = {
  id: "t1",
  nom: "Complexe Test",
  ville: "Tunis",
  type: "gazon_synthetique" as const,
  statut: "actif" as const,
  nombreFormats: 2,
  nombreHoraires: 3,
};

describe("TerrainGestionCard", () => {
  it("renders the terrain name, city and statut label", () => {
    render(<TerrainGestionCard terrain={terrainBase} />);
    expect(screen.getByText("Complexe Test")).toBeInTheDocument();
    expect(screen.getByText(/Tunis/)).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
  });

  it("links to the terrain's edit page", () => {
    render(<TerrainGestionCard terrain={terrainBase} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/proprietaire/terrains/t1/modifier");
  });

  it("shows a pending label for en_attente terrains", () => {
    render(<TerrainGestionCard terrain={{ ...terrainBase, statut: "en_attente" }} />);
    expect(screen.getByText("En attente de validation")).toBeInTheDocument();
  });

  it("shows format and horaire counts", () => {
    render(<TerrainGestionCard terrain={terrainBase} />);
    expect(screen.getByText(/2 formats/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails**

Run: `npx vitest run tests/components/TerrainGestionCard.test.tsx`
Expected: FAIL — cannot resolve `@/components/proprietaire/TerrainGestionCard`.

- [ ] **Step 3: Write `src/components/proprietaire/TerrainGestionCard.tsx`**

```tsx
import Link from "next/link";
import type { TerrainStatut, TerrainType } from "@prisma/client";
import { libelleType } from "@/lib/terrains/format";

export type TerrainGestionCardProps = {
  id: string;
  nom: string;
  ville: string;
  type: TerrainType;
  statut: TerrainStatut;
  nombreFormats: number;
  nombreHoraires: number;
};

const LIBELLES_STATUT: Record<TerrainStatut, string> = {
  actif: "Actif",
  en_attente: "En attente de validation",
  suspendu: "Suspendu",
};

const COULEURS_STATUT: Record<TerrainStatut, string> = {
  actif: "bg-accent text-anthracite",
  en_attente: "bg-gray-100 text-gray-600",
  suspendu: "bg-red-100 text-red-700",
};

export function TerrainGestionCard({ terrain }: { terrain: TerrainGestionCardProps }) {
  return (
    <Link
      href={`/proprietaire/terrains/${terrain.id}/modifier`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-anthracite">{terrain.nom}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {terrain.ville} · {libelleType(terrain.type)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${COULEURS_STATUT[terrain.statut]}`}>
          {LIBELLES_STATUT[terrain.statut]}
        </span>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        {terrain.nombreFormats} format{terrain.nombreFormats > 1 ? "s" : ""} · {terrain.nombreHoraires} plage
        {terrain.nombreHoraires > 1 ? "s" : ""} horaire{terrain.nombreHoraires > 1 ? "s" : ""}
      </p>
    </Link>
  );
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/components/TerrainGestionCard.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Write `src/app/proprietaire/terrains/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { listerTerrainsProprietaire } from "@/lib/terrains/gestion";
import { TerrainGestionCard } from "@/components/proprietaire/TerrainGestionCard";

export default async function ProprietaireTerrainsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    redirect("/");
  }

  const terrains = await listerTerrainsProprietaire(session.user.id);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-anthracite">Mes terrains</h1>
        <Link
          href="/proprietaire/terrains/nouveau"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Ajouter un terrain
        </Link>
      </div>

      {terrains.length === 0 ? (
        <p className="mt-6 text-center text-gray-600">
          Vous n&apos;avez pas encore ajouté de terrain.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {terrains.map((terrain) => (
            <TerrainGestionCard key={terrain.id} terrain={terrain} />
          ))}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 6: Verify with tsc**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/proprietaire/TerrainGestionCard.tsx src/app/proprietaire/terrains/page.tsx tests/components/TerrainGestionCard.test.tsx
git commit -m "feat(proprietaire): add terrains list page"
```

---

## Task N: `CreerTerrainForm` + `/proprietaire/terrains/nouveau`

**Files:**
- Create: `src/components/proprietaire/CreerTerrainForm.tsx`
- Create: `src/app/proprietaire/terrains/nouveau/page.tsx`
- Create: `tests/components/CreerTerrainForm.test.tsx`

**Interfaces:**
- Consumes: `libelleEquipement`, `libelleFormat` (`src/lib/terrains/format.ts`), `POST /api/proprietaire/terrains` (Task H).
- Produces: `CreerTerrainForm` component, `/proprietaire/terrains/nouveau` route. No other task depends on this component's internals.

- [ ] **Step 1: Write the component test file**

Create `tests/components/CreerTerrainForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreerTerrainForm } from "@/components/proprietaire/CreerTerrainForm";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function remplirChampsObligatoires() {
  fireEvent.change(screen.getByLabelText("Nom du terrain"), { target: { value: "Mon terrain" } });
  fireEvent.change(screen.getByLabelText("Adresse"), { target: { value: "Rue Test" } });
  fireEvent.change(screen.getByLabelText("Ville"), { target: { value: "Tunis" } });
  fireEvent.change(screen.getByLabelText("Capacité"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("Prix / créneau (DT)"), { target: { value: "60" } });
}

describe("CreerTerrainForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    global.fetch = vi.fn();
  });

  it("submits with one format and one horaire by default, converting price to millimes", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "t1" }),
    } as Response);

    render(<CreerTerrainForm />);
    remplirChampsObligatoires();
    fireEvent.click(screen.getByRole("button", { name: "Créer le terrain" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/proprietaire/terrains/t1/modifier"));

    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string);
    expect(body.formats).toHaveLength(1);
    expect(body.formats[0].prixParCreneau).toBe(60000);
    expect(body.horaires).toHaveLength(1);
  });

  it("adds and removes format rows", () => {
    render(<CreerTerrainForm />);
    expect(screen.getAllByLabelText("Capacité")).toHaveLength(1);

    fireEvent.click(screen.getByText("+ Ajouter un format"));
    expect(screen.getAllByLabelText("Capacité")).toHaveLength(2);

    fireEvent.click(screen.getAllByText("Retirer")[0]);
    expect(screen.getAllByLabelText("Capacité")).toHaveLength(1);
  });

  it("shows a field error returned by the server", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { nom: ["Le nom est requis"] } }),
    } as Response);

    render(<CreerTerrainForm />);
    remplirChampsObligatoires();
    fireEvent.click(screen.getByRole("button", { name: "Créer le terrain" }));

    expect(await screen.findByText("Le nom est requis")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails**

Run: `npx vitest run tests/components/CreerTerrainForm.test.tsx`
Expected: FAIL — cannot resolve `@/components/proprietaire/CreerTerrainForm`.

- [ ] **Step 3: Write `src/components/proprietaire/CreerTerrainForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { libelleEquipement, libelleFormat } from "@/lib/terrains/format";

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const TYPES = [
  { value: "gazon_synthetique", label: "Gazon synthétique" },
  { value: "gazon_naturel", label: "Gazon naturel" },
  { value: "beton", label: "Béton" },
] as const;

const FORMATS = ["quatre", "cinq", "six", "sept", "huit", "neuf", "onze"] as const;

const EQUIPEMENTS_DISPONIBLES = ["vestiaires", "douches", "eclairage", "parking", "tribunes", "buvette"] as const;

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type LigneFormat = { format: (typeof FORMATS)[number]; capacite: string; prixDinars: string };
type LigneHoraire = { jourSemaine: number; ouvre: string; ferme: string };

function ligneFormatVide(): LigneFormat {
  return { format: "cinq", capacite: "", prixDinars: "" };
}

function ligneHoraireVide(): LigneHoraire {
  return { jourSemaine: 1, ouvre: "08:00", ferme: "22:00" };
}

export function CreerTerrainForm() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("gazon_synthetique");
  const [dureeCreneauMinutes, setDureeCreneauMinutes] = useState("90");
  const [equipements, setEquipements] = useState<string[]>([]);
  const [formats, setFormats] = useState<LigneFormat[]>([ligneFormatVide()]);
  const [horaires, setHoraires] = useState<LigneHoraire[]>([ligneHoraireVide()]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleEquipement(valeur: string) {
    setEquipements((prev) =>
      prev.includes(valeur) ? prev.filter((e) => e !== valeur) : [...prev, valeur]
    );
  }

  function majFormat(index: number, champ: keyof LigneFormat, valeur: string) {
    setFormats((prev) =>
      prev.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne))
    );
  }

  function majHoraire(index: number, champ: keyof LigneHoraire, valeur: string | number) {
    setHoraires((prev) =>
      prev.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne))
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setError("");

    try {
      const response = await fetch("/api/proprietaire/terrains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          description: description || undefined,
          adresse,
          ville,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          type,
          dureeCreneauMinutes: Number(dureeCreneauMinutes),
          equipements,
          formats: formats.map((f) => ({
            format: f.format,
            capacite: Number(f.capacite),
            prixParCreneau: Math.round(Number(f.prixDinars) * 1000),
          })),
          horaires: horaires.map((h) => ({
            jourSemaine: h.jourSemaine,
            ouvre: h.ouvre,
            ferme: h.ferme,
          })),
        }),
      });

      if (!response.ok) {
        try {
          const body = await response.json();
          setErrors(typeof body.error === "object" ? body.error : {});
          if (typeof body.error === "string") setError(body.error);
        } catch {
          setError("Une erreur est survenue. Veuillez réessayer.");
        }
        return;
      }

      const body = await response.json();
      router.push(`/proprietaire/terrains/${body.id}/modifier`);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="nom" className="block text-sm font-medium text-anthracite">Nom du terrain</label>
        <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} className={champClasse} required />
        {errors.nom && <p className="mt-1 text-sm text-red-600">{errors.nom[0]}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-anthracite">Description (optionnel)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={champClasse}
          rows={3}
          maxLength={1000}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description[0]}</p>}
      </div>

      <div>
        <label htmlFor="adresse" className="block text-sm font-medium text-anthracite">Adresse</label>
        <input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} className={champClasse} required />
        {errors.adresse && <p className="mt-1 text-sm text-red-600">{errors.adresse[0]}</p>}
      </div>

      <div>
        <label htmlFor="ville" className="block text-sm font-medium text-anthracite">Ville</label>
        <input id="ville" value={ville} onChange={(e) => setVille(e.target.value)} className={champClasse} required />
        {errors.ville && <p className="mt-1 text-sm text-red-600">{errors.ville[0]}</p>}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="latitude" className="block text-sm font-medium text-anthracite">Latitude (optionnel)</label>
          <input
            id="latitude"
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className={champClasse}
          />
          {errors.latitude && <p className="mt-1 text-sm text-red-600">{errors.latitude[0]}</p>}
        </div>
        <div className="flex-1">
          <label htmlFor="longitude" className="block text-sm font-medium text-anthracite">Longitude (optionnel)</label>
          <input
            id="longitude"
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className={champClasse}
          />
          {errors.longitude && <p className="mt-1 text-sm text-red-600">{errors.longitude[0]}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="type" className="block text-sm font-medium text-anthracite">Type de surface</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className={champClasse}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="dureeCreneauMinutes" className="block text-sm font-medium text-anthracite">
            Durée d&apos;un créneau (minutes)
          </label>
          <input
            id="dureeCreneauMinutes"
            type="number"
            min={15}
            max={240}
            value={dureeCreneauMinutes}
            onChange={(e) => setDureeCreneauMinutes(e.target.value)}
            className={champClasse}
          />
          {errors.dureeCreneauMinutes && <p className="mt-1 text-sm text-red-600">{errors.dureeCreneauMinutes[0]}</p>}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-anthracite">Équipements</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {EQUIPEMENTS_DISPONIBLES.map((equipement) => (
            <label key={equipement} className="flex items-center gap-2 text-sm text-anthracite">
              <input
                type="checkbox"
                checked={equipements.includes(equipement)}
                onChange={() => toggleEquipement(equipement)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              {libelleEquipement(equipement)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium text-anthracite">Formats proposés</legend>
        {errors.formats && <p className="mt-1 text-sm text-red-600">{errors.formats[0]}</p>}
        <div className="flex flex-col gap-3">
          {formats.map((ligne, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-2">
              <div>
                <label htmlFor={`format-${index}`} className="block text-xs text-gray-600">Format</label>
                <select
                  id={`format-${index}`}
                  value={ligne.format}
                  onChange={(e) => majFormat(index, "format", e.target.value)}
                  className={champClasse}
                >
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{libelleFormat(f)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`capacite-${index}`} className="block text-xs text-gray-600">Capacité</label>
                <input
                  id={`capacite-${index}`}
                  type="number"
                  min={2}
                  max={30}
                  value={ligne.capacite}
                  onChange={(e) => majFormat(index, "capacite", e.target.value)}
                  className={champClasse}
                  required
                />
              </div>
              <div>
                <label htmlFor={`prix-${index}`} className="block text-xs text-gray-600">Prix / créneau (DT)</label>
                <input
                  id={`prix-${index}`}
                  type="number"
                  min={0}
                  step="0.001"
                  value={ligne.prixDinars}
                  onChange={(e) => majFormat(index, "prixDinars", e.target.value)}
                  className={champClasse}
                  required
                />
              </div>
              {formats.length > 1 && (
                <button
                  type="button"
                  onClick={() => setFormats((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFormats((prev) => [...prev, ligneFormatVide()])}
          className="mt-2 text-sm font-semibold text-primary hover:underline"
        >
          + Ajouter un format
        </button>
      </fieldset>

      <fieldset className="rounded-lg border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium text-anthracite">Horaires d&apos;ouverture</legend>
        {errors.horaires && <p className="mt-1 text-sm text-red-600">{errors.horaires[0]}</p>}
        <div className="flex flex-col gap-3">
          {horaires.map((ligne, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-2">
              <div>
                <label htmlFor={`jour-${index}`} className="block text-xs text-gray-600">Jour</label>
                <select
                  id={`jour-${index}`}
                  value={ligne.jourSemaine}
                  onChange={(e) => majHoraire(index, "jourSemaine", Number(e.target.value))}
                  className={champClasse}
                >
                  {JOURS.map((jour, i) => (
                    <option key={jour} value={i}>{jour}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`ouvre-${index}`} className="block text-xs text-gray-600">Ouverture</label>
                <input
                  id={`ouvre-${index}`}
                  type="time"
                  value={ligne.ouvre}
                  onChange={(e) => majHoraire(index, "ouvre", e.target.value)}
                  className={champClasse}
                  required
                />
              </div>
              <div>
                <label htmlFor={`ferme-${index}`} className="block text-xs text-gray-600">Fermeture</label>
                <input
                  id={`ferme-${index}`}
                  type="time"
                  value={ligne.ferme}
                  onChange={(e) => majHoraire(index, "ferme", e.target.value)}
                  className={champClasse}
                  required
                />
              </div>
              {horaires.length > 1 && (
                <button
                  type="button"
                  onClick={() => setHoraires((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setHoraires((prev) => [...prev, ligneHoraireVide()])}
          className="mt-2 text-sm font-semibold text-primary hover:underline"
        >
          + Ajouter un horaire
        </button>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
      >
        {submitting ? "Création..." : "Créer le terrain"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/components/CreerTerrainForm.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Write `src/app/proprietaire/terrains/nouveau/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { CreerTerrainForm } from "@/components/proprietaire/CreerTerrainForm";

export default async function NouveauTerrainPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    redirect("/");
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10">
      <h1 className="text-center text-xl font-semibold text-anthracite">Ajouter un terrain</h1>
      <CreerTerrainForm />
    </main>
  );
}
```

- [ ] **Step 6: Verify with tsc**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/proprietaire/CreerTerrainForm.tsx src/app/proprietaire/terrains/nouveau/page.tsx tests/components/CreerTerrainForm.test.tsx
git commit -m "feat(proprietaire): add terrain creation form and page"
```

---

## Task O: Edit page — base fields (`ModifierTerrainForm`, `SupprimerTerrainButton`)

**Files:**
- Create: `src/components/proprietaire/ModifierTerrainForm.tsx`
- Create: `src/components/proprietaire/SupprimerTerrainButton.tsx`
- Create: `src/app/proprietaire/terrains/[id]/modifier/page.tsx`
- Create: `tests/components/ModifierTerrainForm.test.tsx`

**Interfaces:**
- Consumes: `libelleEquipement` (`src/lib/terrains/format.ts`), `trouverTerrainProprietaire` (Task D), `PATCH`/`DELETE /api/proprietaire/terrains/[id]` (Task I).
- Produces: `/proprietaire/terrains/[id]/modifier` route (extended by Tasks P and Q with formats/horaires sections). `ModifierTerrainForm` props: `{terrainId, nom, description, adresse, ville, latitude, longitude, type, dureeCreneauMinutes, equipements}`.

- [ ] **Step 1: Write the component test file**

Create `tests/components/ModifierTerrainForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ModifierTerrainForm } from "@/components/proprietaire/ModifierTerrainForm";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const props = {
  terrainId: "t1",
  nom: "Terrain Test",
  description: "Une description",
  adresse: "Rue Test",
  ville: "Tunis",
  latitude: null,
  longitude: null,
  type: "gazon_synthetique" as const,
  dureeCreneauMinutes: 90,
  equipements: ["vestiaires"],
};

describe("ModifierTerrainForm", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("pre-fills the fields from props", () => {
    render(<ModifierTerrainForm {...props} />);
    expect(screen.getByLabelText("Nom du terrain")).toHaveValue("Terrain Test");
    expect(screen.getByLabelText("Ville")).toHaveValue("Tunis");
  });

  it("submits a PATCH request and shows a success message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Terrain mis à jour." }),
    } as Response);

    render(<ModifierTerrainForm {...props} />);
    fireEvent.change(screen.getByLabelText("Nom du terrain"), { target: { value: "Nouveau nom" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(screen.getByText("Terrain mis à jour.")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/proprietaire/terrains/t1",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows a field error returned by the server", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { nom: ["Le nom est requis"] } }),
    } as Response);

    render(<ModifierTerrainForm {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Le nom est requis")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails**

Run: `npx vitest run tests/components/ModifierTerrainForm.test.tsx`
Expected: FAIL — cannot resolve `@/components/proprietaire/ModifierTerrainForm`.

- [ ] **Step 3: Write `src/components/proprietaire/ModifierTerrainForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { libelleEquipement } from "@/lib/terrains/format";

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const TYPES = [
  { value: "gazon_synthetique", label: "Gazon synthétique" },
  { value: "gazon_naturel", label: "Gazon naturel" },
  { value: "beton", label: "Béton" },
] as const;

const EQUIPEMENTS_DISPONIBLES = ["vestiaires", "douches", "eclairage", "parking", "tribunes", "buvette"] as const;

export type ModifierTerrainFormProps = {
  terrainId: string;
  nom: string;
  description: string | null;
  adresse: string;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  type: (typeof TYPES)[number]["value"];
  dureeCreneauMinutes: number;
  equipements: string[];
};

export function ModifierTerrainForm(props: ModifierTerrainFormProps) {
  const router = useRouter();
  const [nom, setNom] = useState(props.nom);
  const [description, setDescription] = useState(props.description ?? "");
  const [adresse, setAdresse] = useState(props.adresse);
  const [ville, setVille] = useState(props.ville);
  const [latitude, setLatitude] = useState(props.latitude !== null ? String(props.latitude) : "");
  const [longitude, setLongitude] = useState(props.longitude !== null ? String(props.longitude) : "");
  const [type, setType] = useState(props.type);
  const [dureeCreneauMinutes, setDureeCreneauMinutes] = useState(String(props.dureeCreneauMinutes));
  const [equipements, setEquipements] = useState<string[]>(props.equipements);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [succes, setSucces] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function toggleEquipement(valeur: string) {
    setEquipements((prev) =>
      prev.includes(valeur) ? prev.filter((e) => e !== valeur) : [...prev, valeur]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setError("");
    setSucces(false);

    try {
      const response = await fetch(`/api/proprietaire/terrains/${props.terrainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          description: description || undefined,
          adresse,
          ville,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          type,
          dureeCreneauMinutes: Number(dureeCreneauMinutes),
          equipements,
        }),
      });

      if (!response.ok) {
        try {
          const body = await response.json();
          setErrors(typeof body.error === "object" ? body.error : {});
          if (typeof body.error === "string") setError(body.error);
        } catch {
          setError("Une erreur est survenue. Veuillez réessayer.");
        }
        return;
      }

      setSucces(true);
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="nom" className="block text-sm font-medium text-anthracite">Nom du terrain</label>
        <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} className={champClasse} required />
        {errors.nom && <p className="mt-1 text-sm text-red-600">{errors.nom[0]}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-anthracite">Description (optionnel)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={champClasse}
          rows={3}
          maxLength={1000}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description[0]}</p>}
      </div>

      <div>
        <label htmlFor="adresse" className="block text-sm font-medium text-anthracite">Adresse</label>
        <input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} className={champClasse} required />
        {errors.adresse && <p className="mt-1 text-sm text-red-600">{errors.adresse[0]}</p>}
      </div>

      <div>
        <label htmlFor="ville" className="block text-sm font-medium text-anthracite">Ville</label>
        <input id="ville" value={ville} onChange={(e) => setVille(e.target.value)} className={champClasse} required />
        {errors.ville && <p className="mt-1 text-sm text-red-600">{errors.ville[0]}</p>}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="latitude" className="block text-sm font-medium text-anthracite">Latitude (optionnel)</label>
          <input
            id="latitude"
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className={champClasse}
          />
          {errors.latitude && <p className="mt-1 text-sm text-red-600">{errors.latitude[0]}</p>}
        </div>
        <div className="flex-1">
          <label htmlFor="longitude" className="block text-sm font-medium text-anthracite">Longitude (optionnel)</label>
          <input
            id="longitude"
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className={champClasse}
          />
          {errors.longitude && <p className="mt-1 text-sm text-red-600">{errors.longitude[0]}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="type" className="block text-sm font-medium text-anthracite">Type de surface</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className={champClasse}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="dureeCreneauMinutes" className="block text-sm font-medium text-anthracite">
            Durée d&apos;un créneau (minutes)
          </label>
          <input
            id="dureeCreneauMinutes"
            type="number"
            min={15}
            max={240}
            value={dureeCreneauMinutes}
            onChange={(e) => setDureeCreneauMinutes(e.target.value)}
            className={champClasse}
          />
          {errors.dureeCreneauMinutes && <p className="mt-1 text-sm text-red-600">{errors.dureeCreneauMinutes[0]}</p>}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-anthracite">Équipements</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {EQUIPEMENTS_DISPONIBLES.map((equipement) => (
            <label key={equipement} className="flex items-center gap-2 text-sm text-anthracite">
              <input
                type="checkbox"
                checked={equipements.includes(equipement)}
                onChange={() => toggleEquipement(equipement)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              {libelleEquipement(equipement)}
            </label>
          ))}
        </div>
      </fieldset>

      {succes && <p className="text-sm text-green-700">Terrain mis à jour.</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
      >
        {submitting ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/components/ModifierTerrainForm.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Write `src/components/proprietaire/SupprimerTerrainButton.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SupprimerTerrainButton({ terrainId }: { terrainId: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function handleClick() {
    if (!window.confirm("Supprimer définitivement ce terrain ?")) return;
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/proprietaire/terrains/${terrainId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      router.push("/proprietaire/terrains");
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={envoi}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Supprimer ce terrain
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Write `src/app/proprietaire/terrains/[id]/modifier/page.tsx`**

```tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { trouverTerrainProprietaire } from "@/lib/terrains/gestion";
import { ModifierTerrainForm } from "@/components/proprietaire/ModifierTerrainForm";
import { SupprimerTerrainButton } from "@/components/proprietaire/SupprimerTerrainButton";

export default async function ModifierTerrainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    redirect("/");
  }

  const { id } = await params;
  const terrain = await trouverTerrainProprietaire(id, session.user.id);
  if (!terrain) notFound();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10">
      <Link href="/proprietaire/terrains" className="text-sm text-primary hover:underline">
        ← Retour à mes terrains
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-anthracite">{terrain.nom}</h1>
        <SupprimerTerrainButton terrainId={terrain.id} />
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-anthracite">Informations générales</h2>
        <div className="mt-3">
          <ModifierTerrainForm
            terrainId={terrain.id}
            nom={terrain.nom}
            description={terrain.description}
            adresse={terrain.adresse}
            ville={terrain.ville}
            latitude={terrain.latitude}
            longitude={terrain.longitude}
            type={terrain.type}
            dureeCreneauMinutes={terrain.dureeCreneauMinutes}
            equipements={terrain.equipements}
          />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 7: Verify with tsc**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/proprietaire/ModifierTerrainForm.tsx src/components/proprietaire/SupprimerTerrainButton.tsx "src/app/proprietaire/terrains/[id]/modifier/page.tsx" tests/components/ModifierTerrainForm.test.tsx
git commit -m "feat(proprietaire): add terrain edit page base fields and delete"
```

---

## Task P: `FormatsManager` + wiring into the edit page

**Files:**
- Create: `src/components/proprietaire/FormatsManager.tsx`
- Create: `tests/components/FormatsManager.test.tsx`
- Modify: `src/app/proprietaire/terrains/[id]/modifier/page.tsx`

**Interfaces:**
- Consumes: `formatPrix`, `libelleFormat` (`src/lib/terrains/format.ts`), `POST /api/proprietaire/terrains/[id]/formats` and `PATCH`/`DELETE .../formats/[formatId]` (Task J).
- Produces: `FormatsManager({terrainId, formats: FormatLigne[]})` component, wired into the edit page's new "Formats et tarifs" section. `FormatLigne = {id, format: FormatEquipe, capacite: number, prixParCreneau: number}`.

- [ ] **Step 1: Write the component test file**

Create `tests/components/FormatsManager.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FormatsManager } from "@/components/proprietaire/FormatsManager";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const formats = [
  { id: "f1", format: "cinq" as const, capacite: 10, prixParCreneau: 60000 },
];

describe("FormatsManager", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
    window.confirm = vi.fn(() => true);
  });

  it("renders existing formats", () => {
    render(<FormatsManager terrainId="t1" formats={formats} />);
    expect(screen.getByText(/5 contre 5/)).toBeInTheDocument();
    expect(screen.getByText(/60,000 DT/)).toBeInTheDocument();
  });

  it("adds a new format via POST", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: "f2" }),
    } as Response);

    render(<FormatsManager terrainId="t1" formats={formats} />);
    fireEvent.change(screen.getByLabelText("Capacité"), { target: { value: "14" } });
    fireEvent.change(screen.getByLabelText("Prix / créneau (DT)"), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/proprietaire/terrains/t1/formats",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("deletes a format after confirmation", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    } as Response);

    render(<FormatsManager terrainId="t1" formats={formats} />);
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/proprietaire/terrains/t1/formats/f1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("switches a row into edit mode and saves via PATCH", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    } as Response);

    render(<FormatsManager terrainId="t1" formats={formats} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/proprietaire/terrains/t1/formats/f1",
      expect.objectContaining({ method: "PATCH" })
    );
  });

  it("shows a server error message when deletion is refused", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Impossible de supprimer le dernier format d'un terrain" }),
    } as Response);

    render(<FormatsManager terrainId="t1" formats={formats} />);
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));

    expect(
      await screen.findByText("Impossible de supprimer le dernier format d'un terrain")
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails**

Run: `npx vitest run tests/components/FormatsManager.test.tsx`
Expected: FAIL — cannot resolve `@/components/proprietaire/FormatsManager`.

- [ ] **Step 3: Write `src/components/proprietaire/FormatsManager.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrix, libelleFormat } from "@/lib/terrains/format";
import type { FormatEquipe } from "@prisma/client";

export type FormatLigne = {
  id: string;
  format: FormatEquipe;
  capacite: number;
  prixParCreneau: number;
};

const FORMATS_DISPONIBLES: FormatEquipe[] = ["quatre", "cinq", "six", "sept", "huit", "neuf", "onze"];

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function FormatsManager({ terrainId, formats }: { terrainId: string; formats: FormatLigne[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCapacite, setEditCapacite] = useState("");
  const [editPrixDinars, setEditPrixDinars] = useState("");
  const [nouveauFormat, setNouveauFormat] = useState<FormatEquipe>("cinq");
  const [nouvelleCapacite, setNouvelleCapacite] = useState("");
  const [nouveauPrixDinars, setNouveauPrixDinars] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  function commencerEdition(ligne: FormatLigne) {
    setEditingId(ligne.id);
    setEditCapacite(String(ligne.capacite));
    setEditPrixDinars(String(ligne.prixParCreneau / 1000));
    setErreur("");
  }

  async function enregistrerEdition(formatId: string) {
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/proprietaire/terrains/${terrainId}/formats/${formatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacite: Number(editCapacite),
          prixParCreneau: Math.round(Number(editPrixDinars) * 1000),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(formatId: string) {
    if (!window.confirm("Retirer ce format ?")) return;
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/proprietaire/terrains/${terrainId}/formats/${formatId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  async function ajouter() {
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/proprietaire/terrains/${terrainId}/formats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: nouveauFormat,
          capacite: Number(nouvelleCapacite),
          prixParCreneau: Math.round(Number(nouveauPrixDinars) * 1000),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      setNouvelleCapacite("");
      setNouveauPrixDinars("");
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {formats.map((ligne) => (
          <li key={ligne.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-2">
            {editingId === ligne.id ? (
              <>
                <div>
                  <label htmlFor={`edit-capacite-${ligne.id}`} className="block text-xs text-gray-600">Capacité</label>
                  <input
                    id={`edit-capacite-${ligne.id}`}
                    type="number"
                    min={2}
                    max={30}
                    value={editCapacite}
                    onChange={(e) => setEditCapacite(e.target.value)}
                    className={champClasse}
                  />
                </div>
                <div>
                  <label htmlFor={`edit-prix-${ligne.id}`} className="block text-xs text-gray-600">Prix / créneau (DT)</label>
                  <input
                    id={`edit-prix-${ligne.id}`}
                    type="number"
                    min={0}
                    step="0.001"
                    value={editPrixDinars}
                    onChange={(e) => setEditPrixDinars(e.target.value)}
                    className={champClasse}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => enregistrerEdition(ligne.id)}
                  disabled={envoi}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-anthracite"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-anthracite">
                  {libelleFormat(ligne.format)} · {ligne.capacite} joueurs max · {formatPrix(ligne.prixParCreneau)}
                </span>
                <button
                  type="button"
                  onClick={() => commencerEdition(ligne)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-anthracite"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => supprimer(ligne.id)}
                  disabled={envoi}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Retirer
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-2">
        <div>
          <label htmlFor="nouveau-format" className="block text-xs text-gray-600">Format</label>
          <select
            id="nouveau-format"
            value={nouveauFormat}
            onChange={(e) => setNouveauFormat(e.target.value as FormatEquipe)}
            className={champClasse}
          >
            {FORMATS_DISPONIBLES.map((f) => (
              <option key={f} value={f}>{libelleFormat(f)}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="nouvelle-capacite" className="block text-xs text-gray-600">Capacité</label>
          <input
            id="nouvelle-capacite"
            type="number"
            min={2}
            max={30}
            value={nouvelleCapacite}
            onChange={(e) => setNouvelleCapacite(e.target.value)}
            className={champClasse}
          />
        </div>
        <div>
          <label htmlFor="nouveau-prix" className="block text-xs text-gray-600">Prix / créneau (DT)</label>
          <input
            id="nouveau-prix"
            type="number"
            min={0}
            step="0.001"
            value={nouveauPrixDinars}
            onChange={(e) => setNouveauPrixDinars(e.target.value)}
            className={champClasse}
          />
        </div>
        <button
          type="button"
          onClick={ajouter}
          disabled={envoi || !nouvelleCapacite || !nouveauPrixDinars}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/components/FormatsManager.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Wire `FormatsManager` into the edit page**

In `src/app/proprietaire/terrains/[id]/modifier/page.tsx`, change the import block:

```tsx
import { ModifierTerrainForm } from "@/components/proprietaire/ModifierTerrainForm";
import { SupprimerTerrainButton } from "@/components/proprietaire/SupprimerTerrainButton";
```

to:

```tsx
import { ModifierTerrainForm } from "@/components/proprietaire/ModifierTerrainForm";
import { FormatsManager } from "@/components/proprietaire/FormatsManager";
import { SupprimerTerrainButton } from "@/components/proprietaire/SupprimerTerrainButton";
```

Then change the end of the file:

```tsx
            equipements={terrain.equipements}
          />
        </div>
      </section>
    </main>
  );
}
```

to:

```tsx
            equipements={terrain.equipements}
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-anthracite">Formats et tarifs</h2>
        <div className="mt-3">
          <FormatsManager terrainId={terrain.id} formats={terrain.formats} />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Verify with tsc**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/proprietaire/FormatsManager.tsx tests/components/FormatsManager.test.tsx "src/app/proprietaire/terrains/[id]/modifier/page.tsx"
git commit -m "feat(proprietaire): add formats manager to edit page"
```

---

## Task Q: `HorairesManager` + final wiring into the edit page

**Files:**
- Create: `src/components/proprietaire/HorairesManager.tsx`
- Create: `tests/components/HorairesManager.test.tsx`
- Modify: `src/app/proprietaire/terrains/[id]/modifier/page.tsx`

**Interfaces:**
- Consumes: `PUT /api/proprietaire/terrains/[id]/horaires` (Task K).
- Produces: `HorairesManager({terrainId, horaires: HoraireLigne[]})` component, wired into the edit page's new "Horaires d'ouverture" section — this completes the edit page.

- [ ] **Step 1: Write the component test file**

Create `tests/components/HorairesManager.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HorairesManager } from "@/components/proprietaire/HorairesManager";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

const horaires = [{ jourSemaine: 1, ouvre: "08:00", ferme: "22:00" }];

describe("HorairesManager", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn();
  });

  it("pre-fills rows from props", () => {
    render(<HorairesManager terrainId="t1" horaires={horaires} />);
    expect(screen.getByLabelText("Ouverture")).toHaveValue("08:00");
  });

  it("adds and removes rows", () => {
    render(<HorairesManager terrainId="t1" horaires={horaires} />);
    fireEvent.click(screen.getByText("+ Ajouter un horaire"));
    expect(screen.getAllByLabelText("Ouverture")).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Retirer" })[0]);
    expect(screen.getAllByLabelText("Ouverture")).toHaveLength(1);
  });

  it("saves via PUT and shows a success message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    } as Response);

    render(<HorairesManager terrainId="t1" horaires={horaires} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les horaires" }));

    await waitFor(() => expect(screen.getByText("Horaires enregistrés.")).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/proprietaire/terrains/t1/horaires",
      expect.objectContaining({ method: "PUT" })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows a server error message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Terrain introuvable" }),
    } as Response);

    render(<HorairesManager terrainId="t1" horaires={horaires} />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les horaires" }));

    expect(await screen.findByText("Terrain introuvable")).toBeInTheDocument();
  });

  it("falls back to one empty row when there are no existing horaires", () => {
    render(<HorairesManager terrainId="t1" horaires={[]} />);
    expect(screen.getAllByLabelText("Ouverture")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test file, confirm it fails**

Run: `npx vitest run tests/components/HorairesManager.test.tsx`
Expected: FAIL — cannot resolve `@/components/proprietaire/HorairesManager`.

- [ ] **Step 3: Write `src/components/proprietaire/HorairesManager.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type HoraireLigne = { jourSemaine: number; ouvre: string; ferme: string };

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function ligneVide(): HoraireLigne {
  return { jourSemaine: 1, ouvre: "08:00", ferme: "22:00" };
}

export function HorairesManager({
  terrainId,
  horaires: horairesInitiaux,
}: {
  terrainId: string;
  horaires: HoraireLigne[];
}) {
  const router = useRouter();
  const [horaires, setHoraires] = useState<HoraireLigne[]>(
    horairesInitiaux.length > 0 ? horairesInitiaux : [ligneVide()]
  );
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  function majLigne(index: number, champ: keyof HoraireLigne, valeur: string | number) {
    setHoraires((prev) => prev.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne)));
  }

  async function enregistrer() {
    setEnvoi(true);
    setErreur("");
    setSucces(false);
    try {
      const response = await fetch(`/api/proprietaire/terrains/${terrainId}/horaires`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horaires }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      setSucces(true);
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}
      {succes && <p className="text-sm text-green-700">Horaires enregistrés.</p>}

      <div className="flex flex-col gap-2">
        {horaires.map((ligne, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-2">
            <div>
              <label htmlFor={`h-jour-${index}`} className="block text-xs text-gray-600">Jour</label>
              <select
                id={`h-jour-${index}`}
                value={ligne.jourSemaine}
                onChange={(e) => majLigne(index, "jourSemaine", Number(e.target.value))}
                className={champClasse}
              >
                {JOURS.map((jour, i) => (
                  <option key={jour} value={i}>{jour}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`h-ouvre-${index}`} className="block text-xs text-gray-600">Ouverture</label>
              <input
                id={`h-ouvre-${index}`}
                type="time"
                value={ligne.ouvre}
                onChange={(e) => majLigne(index, "ouvre", e.target.value)}
                className={champClasse}
              />
            </div>
            <div>
              <label htmlFor={`h-ferme-${index}`} className="block text-xs text-gray-600">Fermeture</label>
              <input
                id={`h-ferme-${index}`}
                type="time"
                value={ligne.ferme}
                onChange={(e) => majLigne(index, "ferme", e.target.value)}
                className={champClasse}
              />
            </div>
            {horaires.length > 1 && (
              <button
                type="button"
                onClick={() => setHoraires((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Retirer
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setHoraires((prev) => [...prev, ligneVide()])}
          className="text-sm font-semibold text-primary hover:underline"
        >
          + Ajouter un horaire
        </button>
        <button
          type="button"
          onClick={enregistrer}
          disabled={envoi}
          className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {envoi ? "Enregistrement..." : "Enregistrer les horaires"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test file, confirm it passes**

Run: `npx vitest run tests/components/HorairesManager.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Wire `HorairesManager` into the edit page (final composition)**

In `src/app/proprietaire/terrains/[id]/modifier/page.tsx`, change the import block:

```tsx
import { ModifierTerrainForm } from "@/components/proprietaire/ModifierTerrainForm";
import { FormatsManager } from "@/components/proprietaire/FormatsManager";
import { SupprimerTerrainButton } from "@/components/proprietaire/SupprimerTerrainButton";
```

to:

```tsx
import { ModifierTerrainForm } from "@/components/proprietaire/ModifierTerrainForm";
import { FormatsManager } from "@/components/proprietaire/FormatsManager";
import { HorairesManager } from "@/components/proprietaire/HorairesManager";
import { SupprimerTerrainButton } from "@/components/proprietaire/SupprimerTerrainButton";
```

Then change the end of the file:

```tsx
          <FormatsManager terrainId={terrain.id} formats={terrain.formats} />
        </div>
      </section>
    </main>
  );
}
```

to:

```tsx
          <FormatsManager terrainId={terrain.id} formats={terrain.formats} />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-anthracite">Horaires d&apos;ouverture</h2>
        <div className="mt-3">
          <HorairesManager terrainId={terrain.id} horaires={terrain.horaires} />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Verify with tsc**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/proprietaire/HorairesManager.tsx tests/components/HorairesManager.test.tsx "src/app/proprietaire/terrains/[id]/modifier/page.tsx"
git commit -m "feat(proprietaire): add horaires manager, complete edit page"
```

---

## Final Verification (after all tasks pass individual review)

Not a plan "task" in the subagent-driven-development sense (no fresh subagent needed) — this is the controller's own final-branch check per the top-level brief's Process step 3, run after the whole-branch review is clean:

1. `npx vitest run` (full suite) — three consecutive times, all green.
2. `npx tsc --noEmit` — clean.
3. `npm run lint` — clean.
4. `npm run build` — clean.

Do not merge, do not push. Report completion to the controller with the full verification output and the "Rulings Made" list above.

---

## Self-Review Notes (performed by the planning agent before handoff)

- **Spec coverage:** Every bullet in the brief's "Required surface" and "Scope boundaries" sections maps to a task: signup extension → A; middleware → B; validation → C; all six `gestion.ts` mutation functions plus the two read helpers → D–G; all five API route files → H–K; dashboard/list/create/edit pages → L–Q. Ownership checks and typed `{ok:false, raison}` results are enforced in every `gestion.ts` function (D–G) and threaded through every API route (H–K). The "at least one format" and "at least one horaire" requirements are enforced in `creerTerrainSchema` (Task C, zod `.min(1)`) and mirrored in the `CreerTerrainForm` UI (Task N, default one row of each, "Retirer" disabled below one row).
- **Placeholder scan:** No task contains "TBD"/"add validation"/"similar to Task N" — every step has literal, complete file contents.
- **Type consistency:** `FormatInput`/`HoraireInput`/`TerrainBaseInput`/`TerrainGestionResume`/`TerrainGestionDetail` (Task D) are reused verbatim by every later task that touches `gestion.ts` or its API routes. `FormatLigne` (Task P) and `HoraireLigne` (Task Q) match the shapes returned by `trouverTerrainProprietaire` (Task D) so the edit page (Tasks O–Q) can pass `terrain.formats`/`terrain.horaires` straight through without adapters.
