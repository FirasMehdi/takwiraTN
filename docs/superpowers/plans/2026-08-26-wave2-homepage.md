# Homepage Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub `src/app/page.tsx` with a real landing page that explains Takwria TN to both players and terrain owners, with two distinct signup CTAs and real DB-derived stats, styled natively with the app's existing Tailwind design language.

**Architecture:** One new read-only query module (`src/lib/homepage/queries.ts`) feeds an async server-component page (`src/app/page.tsx`) that composes four new presentational components under `src/components/homepage/`: `HeroSection`, `StatsSection`, `AudienceSection` (reused once per audience), and `HowItWorksSection`. No new dependencies, no schema changes, no writes.

**Tech Stack:** Next.js 15 App Router (React 19 server components), TypeScript, Prisma 5 + PostgreSQL, Tailwind CSS 3, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-26-wave2-homepage-design.md`

## Global Constraints

- French UI copy throughout, consistent with existing app convention.
- Reuse existing Tailwind tokens only: `primary` / `primary-dark` / `primary-light` / `accent` / `anthracite` (see `tailwind.config.ts`) plus stock Tailwind grays/white. No new colors, no gradients (none exist elsewhere in the app).
- Reuse `TerrainIllustration` from `src/components/ui/TerrainIllustration.tsx` for the hero visual — do not create a new illustration.
- Do not touch: `src/app/admin/**`, `src/lib/admin/**`, `src/app/proprietaire/**`, `src/lib/terrains/gestion.ts`, `src/lib/matchs/queries.ts`, `src/app/matchs/**`, `src/components/matchs/**`, `src/middleware.ts`, `tests/setup/testDb.ts`, `src/lib/validation/auth.ts`, `src/app/api/inscription/route.ts`.
- Do not touch `src/app/layout.tsx`.
- Player CTA: `href="/inscription"`, label "Rejoindre en tant que joueur".
- Terrain owner CTA: `href="/inscription?type=proprietaire"`, label "Inscrire mon terrain". This query param is optional/harmless either way — a parallel sub-project may or may not read it.
- Stats: `prisma.user.count({ where: { role: "joueur" } })`, `prisma.user.count({ where: { role: "proprietaire" } })`, `prisma.terrain.count({ where: { statut: "actif" } })`, `prisma.match.count()` (no status filter).
- Every new component/module gets a Vitest test, following existing patterns in `tests/components/*.test.tsx` and `tests/lib/**/*.test.ts`.
- No apostrophes in new French copy strings (sidesteps the `react/no-unescaped-entities` `&apos;` requirement seen elsewhere in the codebase) — verified for every string below.

---

### Task 1: Homepage stats query

**Files:**
- Create: `src/lib/homepage/queries.ts`
- Test: `tests/lib/homepage/queries.test.ts`

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma.ts` (`import { prisma } from "@/lib/prisma";`); `hashPassword` from `src/lib/password.ts` (test only).
- Produces:
  ```ts
  export type StatsAccueil = {
    joueurs: number;
    proprietaires: number;
    terrains: number;
    matchs: number;
  };
  export async function findStatsAccueil(): Promise<StatsAccueil>;
  ```
  Task 6 (`src/app/page.tsx`) and Task 3 (`StatsSection`) import `StatsAccueil` and `findStatsAccueil` from `@/lib/homepage/queries`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/homepage/queries.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import { findStatsAccueil } from "@/lib/homepage/queries";

async function creerUtilisateur(
  email: string,
  role: "joueur" | "proprietaire" | "administrateur" = "joueur"
) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
    },
  });
}

async function creerTerrain(overrides: Record<string, unknown> = {}) {
  return prisma.terrain.create({
    data: {
      nom: "Terrain Test",
      adresse: "Rue Test",
      ville: "Tunis",
      type: "gazon_synthetique",
      formats: { create: [{ format: "cinq", capacite: 10, prixParCreneau: 50000 }] },
      ...overrides,
    },
  });
}

describe("findStatsAccueil", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns zeroed stats on an empty database", async () => {
    const stats = await findStatsAccueil();
    expect(stats).toEqual({ joueurs: 0, proprietaires: 0, terrains: 0, matchs: 0 });
  });

  it("counts users by role", async () => {
    await creerUtilisateur("j1@example.com", "joueur");
    await creerUtilisateur("j2@example.com", "joueur");
    await creerUtilisateur("p1@example.com", "proprietaire");
    await creerUtilisateur("a1@example.com", "administrateur");

    const stats = await findStatsAccueil();

    expect(stats.joueurs).toBe(2);
    expect(stats.proprietaires).toBe(1);
  });

  it("counts only active terrains, not pending or suspended ones", async () => {
    await creerTerrain();
    await creerTerrain({ statut: "en_attente" });
    await creerTerrain({ statut: "suspendu" });

    const stats = await findStatsAccueil();

    expect(stats.terrains).toBe(1);
  });

  it("counts all matches regardless of status", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com", "joueur");

    await prisma.match.create({
      data: {
        terrainId: terrain.id,
        organisateurId: organisateur.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
      },
    });
    await prisma.match.create({
      data: {
        terrainId: terrain.id,
        organisateurId: organisateur.id,
        date: "2026-09-08",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
        statut: "annule",
      },
    });

    const stats = await findStatsAccueil();

    expect(stats.matchs).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/homepage/queries.test.ts`
Expected: FAIL — `Cannot find module '@/lib/homepage/queries'` (module does not exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/homepage/queries.ts`:

```ts
import { prisma } from "@/lib/prisma";

export type StatsAccueil = {
  joueurs: number;
  proprietaires: number;
  terrains: number;
  matchs: number;
};

/**
 * Chiffres clés affichés sur la page d'accueil. Comptages simples,
 * volontairement sans logique métier : ce sous-projet ne fait qu'informer.
 * "terrains" ne compte que les terrains actifs (ceux réellement visibles
 * sur /terrains) ; "matchs" compte tous les matchs quel que soit leur
 * statut, y compris annulés — la stat sert à prouver l'activité de la
 * plateforme, pas la disponibilité.
 */
export async function findStatsAccueil(): Promise<StatsAccueil> {
  const [joueurs, proprietaires, terrains, matchs] = await Promise.all([
    prisma.user.count({ where: { role: "joueur" } }),
    prisma.user.count({ where: { role: "proprietaire" } }),
    prisma.terrain.count({ where: { statut: "actif" } }),
    prisma.match.count(),
  ]);

  return { joueurs, proprietaires, terrains, matchs };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/homepage/queries.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/homepage/queries.ts tests/lib/homepage/queries.test.ts
git commit -m "feat(homepage): add findStatsAccueil query"
```

---

### Task 2: HeroSection component

**Files:**
- Create: `src/components/homepage/HeroSection.tsx`
- Test: `tests/components/HeroSection.test.tsx`

**Interfaces:**
- Consumes: `TerrainIllustration` from `@/components/ui/TerrainIllustration` (no props needed beyond `className`); `Link` from `next/link`.
- Produces: `export function HeroSection(): JSX.Element` — no props. Task 6 renders `<HeroSection />` with no arguments.

- [ ] **Step 1: Write the failing test**

Create `tests/components/HeroSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroSection } from "@/components/homepage/HeroSection";

describe("HeroSection", () => {
  it("shows the platform name and tagline", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Takwria TN" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/connecte les joueurs aux terrains/)
    ).toBeInTheDocument();
  });

  it("links the player CTA to inscription", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("link", { name: "Rejoindre en tant que joueur" })
    ).toHaveAttribute("href", "/inscription");
  });

  it("links the terrain owner CTA to inscription with the proprietaire query param", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("link", { name: "Inscrire mon terrain" })
    ).toHaveAttribute("href", "/inscription?type=proprietaire");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/HeroSection.test.tsx`
Expected: FAIL — `Cannot find module '@/components/homepage/HeroSection'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/homepage/HeroSection.tsx`:

```tsx
import Link from "next/link";
import { TerrainIllustration } from "@/components/ui/TerrainIllustration";

export function HeroSection() {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative">
        <TerrainIllustration className="h-40 w-full object-cover" />
        <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-anthracite">
          ⚽ Nouveau à Tunis, Sfax, Sousse et Ariana
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
        <h1 className="text-3xl font-bold text-anthracite">Takwria TN</h1>
        <p className="max-w-sm text-gray-600">
          La plateforme tunisienne qui connecte les joueurs aux terrains — et
          les terrains aux joueurs.
        </p>

        <div className="mt-2 flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/inscription"
            className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark"
          >
            Rejoindre en tant que joueur
          </Link>
          <Link
            href="/inscription?type=proprietaire"
            className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-primary/5"
          >
            Inscrire mon terrain
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/HeroSection.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/homepage/HeroSection.tsx tests/components/HeroSection.test.tsx
git commit -m "feat(homepage): add HeroSection component"
```

---

### Task 3: StatsSection component

**Files:**
- Create: `src/components/homepage/StatsSection.tsx`
- Test: `tests/components/StatsSection.test.tsx`

**Interfaces:**
- Consumes: `StatsAccueil` type from `@/lib/homepage/queries` (Task 1 — import type only, no DB call in this component).
- Produces: `export function StatsSection({ stats }: { stats: StatsAccueil }): JSX.Element`. Task 6 renders `<StatsSection stats={stats} />` where `stats` comes from `findStatsAccueil()`.

- [ ] **Step 1: Write the failing test**

Create `tests/components/StatsSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsSection } from "@/components/homepage/StatsSection";

const stats = { joueurs: 128, proprietaires: 14, terrains: 22, matchs: 340 };

describe("StatsSection", () => {
  it("shows each stat with its French label", () => {
    render(<StatsSection stats={stats} />);

    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("Joueurs inscrits")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("Propriétaires partenaires")).toBeInTheDocument();
    expect(screen.getByText("22")).toBeInTheDocument();
    expect(screen.getByText("Terrains disponibles")).toBeInTheDocument();
    expect(screen.getByText("340")).toBeInTheDocument();
    expect(screen.getByText("Matchs organisés")).toBeInTheDocument();
  });

  it("formats large numbers using French thousands separators", () => {
    render(
      <StatsSection
        stats={{ joueurs: 12345, proprietaires: 0, terrains: 0, matchs: 0 }}
      />
    );

    // Computed via the same API the component uses, so the expectation
    // adapts to whatever separator character the runtime's ICU picks
    // (regular space vs. narrow no-break space) instead of hardcoding one.
    expect(screen.getByText((12345).toLocaleString("fr-FR"))).toBeInTheDocument();
  });

  it("shows zero rather than hiding a stat when a count is empty", () => {
    render(
      <StatsSection stats={{ joueurs: 0, proprietaires: 0, terrains: 0, matchs: 0 }} />
    );

    expect(screen.getAllByText("0")).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/StatsSection.test.tsx`
Expected: FAIL — `Cannot find module '@/components/homepage/StatsSection'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/homepage/StatsSection.tsx`:

```tsx
import type { StatsAccueil } from "@/lib/homepage/queries";

const LIBELLES: { cle: keyof StatsAccueil; label: string }[] = [
  { cle: "joueurs", label: "Joueurs inscrits" },
  { cle: "proprietaires", label: "Propriétaires partenaires" },
  { cle: "terrains", label: "Terrains disponibles" },
  { cle: "matchs", label: "Matchs organisés" },
];

export function StatsSection({ stats }: { stats: StatsAccueil }) {
  return (
    <section aria-label="La communauté Takwria TN en chiffres">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LIBELLES.map(({ cle, label }) => (
          <div
            key={cle}
            className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm"
          >
            <p className="text-2xl font-bold text-primary">
              {stats[cle].toLocaleString("fr-FR")}
            </p>
            <p className="mt-1 text-xs text-gray-600">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/StatsSection.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/homepage/StatsSection.tsx tests/components/StatsSection.test.tsx
git commit -m "feat(homepage): add StatsSection component"
```

---

### Task 4: AudienceSection component

**Files:**
- Create: `src/components/homepage/AudienceSection.tsx`
- Test: `tests/components/AudienceSection.test.tsx`

**Interfaces:**
- Consumes: `Link` from `next/link`.
- Produces:
  ```ts
  export type AudienceFeature = { titre: string; description: string };
  export function AudienceSection(props: {
    eyebrow: string;
    title: string;
    description: string;
    features: AudienceFeature[];
    ctaLabel: string;
    ctaHref: string;
    variant: "joueur" | "proprietaire";
  }): JSX.Element;
  ```
  Task 6 renders this component twice (once per `variant`) with the exact copy given in Task 6's step 3.

- [ ] **Step 1: Write the failing test**

Create `tests/components/AudienceSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AudienceSection } from "@/components/homepage/AudienceSection";

const features = [
  { titre: "Cherchez un terrain", description: "Filtrez par ville, format et prix." },
  { titre: "Rejoignez un match", description: "Trouvez des matchs ouverts près de chez vous." },
];

describe("AudienceSection", () => {
  it("renders the eyebrow, title, description and features", () => {
    render(
      <AudienceSection
        eyebrow="Pour les joueurs"
        title="Trouvez votre prochain match"
        description="Une description."
        features={features}
        ctaLabel="Rejoindre en tant que joueur"
        ctaHref="/inscription"
        variant="joueur"
      />
    );

    expect(screen.getByText("Pour les joueurs")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Trouvez votre prochain match" })
    ).toBeInTheDocument();
    expect(screen.getByText("Une description.")).toBeInTheDocument();
    expect(screen.getByText("Cherchez un terrain")).toBeInTheDocument();
    expect(screen.getByText("Rejoignez un match")).toBeInTheDocument();
  });

  it("links the CTA to the given href with the given label", () => {
    render(
      <AudienceSection
        eyebrow="Pour les propriétaires"
        title="Remplissez votre terrain"
        description="Une description."
        features={features}
        ctaLabel="Inscrire mon terrain"
        ctaHref="/inscription?type=proprietaire"
        variant="proprietaire"
      />
    );

    expect(
      screen.getByRole("link", { name: "Inscrire mon terrain" })
    ).toHaveAttribute("href", "/inscription?type=proprietaire");
  });

  it("renders both variants without crashing", () => {
    const { rerender } = render(
      <AudienceSection
        eyebrow="Pour les joueurs"
        title="Titre joueur"
        description="Description."
        features={features}
        ctaLabel="CTA joueur"
        ctaHref="/inscription"
        variant="joueur"
      />
    );
    expect(screen.getByRole("heading", { name: "Titre joueur" })).toBeInTheDocument();

    rerender(
      <AudienceSection
        eyebrow="Pour les propriétaires"
        title="Titre propriétaire"
        description="Description."
        features={features}
        ctaLabel="CTA propriétaire"
        ctaHref="/inscription?type=proprietaire"
        variant="proprietaire"
      />
    );
    expect(screen.getByRole("heading", { name: "Titre propriétaire" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/AudienceSection.test.tsx`
Expected: FAIL — `Cannot find module '@/components/homepage/AudienceSection'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/homepage/AudienceSection.tsx`:

```tsx
import Link from "next/link";

export type AudienceFeature = {
  titre: string;
  description: string;
};

export function AudienceSection({
  eyebrow,
  title,
  description,
  features,
  ctaLabel,
  ctaHref,
  variant,
}: {
  eyebrow: string;
  title: string;
  description: string;
  features: AudienceFeature[];
  ctaLabel: string;
  ctaHref: string;
  variant: "joueur" | "proprietaire";
}) {
  const estProprietaire = variant === "proprietaire";

  return (
    <section
      className={
        estProprietaire
          ? "rounded-xl border border-anthracite bg-anthracite p-5 shadow-sm"
          : "rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      }
    >
      <span
        className={
          estProprietaire
            ? "rounded-full bg-accent px-3 py-1 text-xs font-bold text-anthracite"
            : "rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
        }
      >
        {eyebrow}
      </span>

      <h2
        className={`mt-3 text-xl font-bold ${
          estProprietaire ? "text-white" : "text-anthracite"
        }`}
      >
        {title}
      </h2>
      <p className={`mt-2 text-sm ${estProprietaire ? "text-white/80" : "text-gray-600"}`}>
        {description}
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature.titre} className="flex gap-3">
            <span
              className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                estProprietaire ? "bg-accent" : "bg-primary"
              }`}
              aria-hidden="true"
            />
            <div>
              <p
                className={`text-sm font-semibold ${
                  estProprietaire ? "text-white" : "text-anthracite"
                }`}
              >
                {feature.titre}
              </p>
              <p className={`text-sm ${estProprietaire ? "text-white/70" : "text-gray-600"}`}>
                {feature.description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={
          estProprietaire
            ? "mt-5 block rounded-lg bg-accent px-4 py-3 text-center font-semibold text-anthracite transition hover:bg-accent/90"
            : "mt-5 block rounded-lg bg-primary px-4 py-3 text-center font-semibold text-white transition hover:bg-primary-dark"
        }
      >
        {ctaLabel}
      </Link>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/AudienceSection.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/homepage/AudienceSection.tsx tests/components/AudienceSection.test.tsx
git commit -m "feat(homepage): add AudienceSection component"
```

---

### Task 5: HowItWorksSection component

**Files:**
- Create: `src/components/homepage/HowItWorksSection.tsx`
- Test: `tests/components/HowItWorksSection.test.tsx`

**Interfaces:**
- Consumes: nothing external beyond React.
- Produces: `export function HowItWorksSection(): JSX.Element` — no props. Task 6 renders `<HowItWorksSection />` with no arguments.

- [ ] **Step 1: Write the failing test**

Create `tests/components/HowItWorksSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HowItWorksSection } from "@/components/homepage/HowItWorksSection";

describe("HowItWorksSection", () => {
  it("shows a heading", () => {
    render(<HowItWorksSection />);
    expect(
      screen.getByRole("heading", { name: "Comment ça marche" })
    ).toBeInTheDocument();
  });

  it("lists the three steps in order", () => {
    render(<HowItWorksSection />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Créez votre compte");
    expect(items[1]).toHaveTextContent("Trouvez ou publiez un terrain");
    expect(items[2]).toHaveTextContent("Jouez");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/HowItWorksSection.test.tsx`
Expected: FAIL — `Cannot find module '@/components/homepage/HowItWorksSection'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/homepage/HowItWorksSection.tsx`:

```tsx
const ETAPES = [
  {
    numero: 1,
    titre: "Créez votre compte",
    description: "Inscrivez-vous en tant que joueur ou propriétaire, gratuitement.",
  },
  {
    numero: 2,
    titre: "Trouvez ou publiez un terrain",
    description: "Parcourez les terrains disponibles, ou ajoutez le vôtre en quelques minutes.",
  },
  {
    numero: 3,
    titre: "Jouez",
    description: "Réservez un créneau, rejoignez un match, et jouez.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-anthracite">Comment ça marche</h2>

      <ol className="mt-4 flex flex-col gap-4">
        {ETAPES.map((etape) => (
          <li key={etape.numero} className="flex gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {etape.numero}
            </span>
            <div>
              <p className="text-sm font-semibold text-anthracite">{etape.titre}</p>
              <p className="text-sm text-gray-600">{etape.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/HowItWorksSection.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/homepage/HowItWorksSection.tsx tests/components/HowItWorksSection.test.tsx
git commit -m "feat(homepage): add HowItWorksSection component"
```

---

### Task 6: Rewrite the homepage to compose all sections

**Files:**
- Modify: `src/app/page.tsx` (full rewrite — replace all existing content, no remnants of the old stub)

**Interfaces:**
- Consumes: `findStatsAccueil` + `StatsAccueil` from `@/lib/homepage/queries` (Task 1); `HeroSection` from `@/components/homepage/HeroSection` (Task 2); `StatsSection` from `@/components/homepage/StatsSection` (Task 3); `AudienceSection` from `@/components/homepage/AudienceSection` (Task 4); `HowItWorksSection` from `@/components/homepage/HowItWorksSection` (Task 5).
- Produces: the default export `HomePage`, an async server component. Nothing downstream consumes this file's exports (it's a route entrypoint).

- [ ] **Step 1: Replace `src/app/page.tsx` in full**

```tsx
import { findStatsAccueil } from "@/lib/homepage/queries";
import { HeroSection } from "@/components/homepage/HeroSection";
import { StatsSection } from "@/components/homepage/StatsSection";
import { AudienceSection } from "@/components/homepage/AudienceSection";
import { HowItWorksSection } from "@/components/homepage/HowItWorksSection";

export default async function HomePage() {
  const stats = await findStatsAccueil();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <HeroSection />

        <StatsSection stats={stats} />

        <AudienceSection
          eyebrow="Pour les joueurs"
          title="Trouvez votre prochain match en quelques clics"
          description="Parcourez les terrains disponibles près de chez vous, réservez un créneau, ou rejoignez un match déjà organisé pour compléter une équipe."
          features={[
            {
              titre: "Cherchez un terrain",
              description:
                "Filtrez par ville, format et prix, et consultez les créneaux libres en temps réel.",
            },
            {
              titre: "Rejoignez un match",
              description:
                "Trouvez des matchs ouverts près de chez vous et inscrivez-vous en un instant.",
            },
            {
              titre: "Formez votre équipe",
              description:
                "Ajoutez des coéquipiers, discutez en groupe et organisez vos parties.",
            },
          ]}
          ctaLabel="Rejoindre en tant que joueur"
          ctaHref="/inscription"
          variant="joueur"
        />

        <AudienceSection
          eyebrow="Pour les propriétaires"
          title="Remplissez votre terrain, pas votre agenda papier"
          description="Publiez votre terrain, définissez vos horaires et vos tarifs, et laissez les joueurs réserver directement en ligne."
          features={[
            {
              titre: "Publiez votre terrain",
              description:
                "Ajoutez photos, équipements, formats proposés et tarifs en quelques minutes.",
            },
            {
              titre: "Gérez vos réservations",
              description:
                "Toutes vos réservations centralisées au même endroit, sans double réservation.",
            },
            {
              titre: "Touchez de nouveaux joueurs",
              description: "Votre terrain visible par toute la communauté Takwria TN.",
            },
          ]}
          ctaLabel="Inscrire mon terrain"
          ctaHref="/inscription?type=proprietaire"
          variant="proprietaire"
        />

        <HowItWorksSection />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the file compiles and no old content remains**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/app/page.tsx`.

Read the file back and confirm it contains none of the old stub's text
("Trouve ton terrain. Forme ton équipe. Joue ton match.", "Réserver un
terrain", "Rejoindre un match" linking to `/terrains` / `/matchs`).

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all pre-existing tests plus the five new test files from
Tasks 1–5 pass. This is the first point at which `findStatsAccueil` is
exercised indirectly through the page composing correctly with real types;
there is no dedicated test file for `page.tsx` itself (see spec doc,
"Tests de `page.tsx`" row — no other page in this repo has one either).

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(homepage): rewrite homepage to serve both players and terrain owners"
```

---

## Post-plan verification (controller, not a task subagent)

After Task 6 is reviewed and clean:

1. `npx vitest run` three consecutive times — all must pass, no flakes.
2. `npx tsc --noEmit` — no errors.
3. `npm run lint` — no errors.
4. `npm run build` — succeeds.

Do not merge, push, or run `finishing-a-development-branch`'s integration
options. Report completion to the controller once all four are clean.
