# Refonte visuelle — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer la direction visuelle approuvée (cartes épurées, bordures fines, l'or comme signal rare pour la disponibilité, le vert pour le prix et l'action principale) à toutes les pages existantes de Takwria TN, sans changer un seul comportement.

**Architecture:** Aucune nouvelle dépendance, aucun nouveau composant partagé, aucun changement de `tailwind.config.ts` — la palette existante (`primary`/`primary.dark`/`anthracite`/`accent`) et les utilitaires Tailwind par défaut (`gray-*`, `rounded-*`, `shadow-*`) suffisent entièrement. Chaque tâche touche un ensemble de fichiers disjoint des autres tâches — aucune tâche ne dépend d'une autre, toutes sont exécutables en parallèle.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, React Testing Library / Vitest pour les tests existants.

**Spec:** `docs/superpowers/specs/2026-08-23-design-refresh-design.md`

## Global Constraints

- Aucun changement de comportement, de route, de schéma de données, ou de texte fonctionnel — seules les classes CSS et la structure JSX purement visuelle changent. Toute exception est documentée tâche par tâche ci-dessous (aucune dans ce plan : chaque tâche préserve le texte et les rôles ARIA exacts testés).
- Mobile-first.
- Copie en français, inchangée.
- `npm test`, `npm run lint`, `npm run build` verts après chaque tâche.
- Commit après chaque tâche.
- Aucune tâche ne touche `tailwind.config.ts` ni `src/app/globals.css` — la palette existante suffit.

---

### Task 1: Page d'accueil

**Files:**
- Modify: `src/app/page.tsx`
- Test: aucun test existant ne couvre cette page (vérifier avec `grep -r "HomePage\|from \"@/app/page\"" tests/` avant de commencer — s'il en existe un, le lire et préserver ce qu'il teste).

**Interfaces:** Aucune — fichier autonome, aucune dépendance d'une autre tâche.

- [ ] **Step 1: Vérifier l'absence de test dédié**

Run: `grep -rl "HomePage" tests/ 2>/dev/null || echo "aucun test trouvé"`

Si un test est trouvé, le lire avant de continuer et adapter le Step 2 pour préserver ce qu'il vérifie (probablement : présence des liens « Réserver un terrain » → `/terrains` et « Rejoindre un match » → `/matchs`, ce que la nouvelle version préserve déjà).

- [ ] **Step 2: Remplacer `src/app/page.tsx` par**

```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center gap-8 bg-gray-50 px-4 py-14 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-anthracite">
          ⚽ Nouveau à Tunis, Sfax, Sousse et Ariana
        </span>
        <h1 className="text-3xl font-bold text-anthracite">Takwria TN</h1>
        <p className="max-w-xs text-gray-600">
          Trouve ton terrain. Forme ton équipe. Joue ton match.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/terrains"
          className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark"
        >
          Réserver un terrain
        </Link>
        <Link
          href="/matchs"
          className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-primary/5"
        >
          Rejoindre un match
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Vérifier manuellement**

Run: `npm run build`
Expected: succès, `/` toujours listée comme route statique (`○`).

- [ ] **Step 4: Lancer la suite complète**

Run: `npm test`
Expected: tous les tests passent (aucun ne devrait référencer cette page d'après le Step 1 ; si un test existait et a été adapté, il passe).

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "style: refresh homepage with approved visual direction"
```

---

### Task 2: Navigation basse

**Files:**
- Modify: `src/components/nav/BottomNav.tsx`
- Test: `tests/components/BottomNav.test.tsx` (existant, ne pas modifier — la nouvelle version doit le satisfaire tel quel)

**Interfaces:** Aucune — fichier autonome.

- [ ] **Step 1: Lire le test existant pour confirmer ce qui doit rester stable**

Le test vérifie : le lien « Profil » a `href="/connexion"` quand déconnecté, et les 4 liens « Accueil », « Terrains », « Matchs », « Joueurs » sont présents avec leur rôle `link`. Le texte et les `href` ne doivent pas changer.

- [ ] **Step 2: Remplacer `src/components/nav/BottomNav.tsx` par**

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
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-gray-200 bg-white py-2.5 shadow-[0_-1px_6px_rgba(0,0,0,0.04)]">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`rounded-md px-2 py-1 text-sm transition ${
            pathname === item.href
              ? "font-semibold text-primary"
              : "text-anthracite/70 hover:text-anthracite"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Lancer le test du composant**

Run: `npx vitest run tests/components/BottomNav.test.tsx`
Expected: 2/2 tests passent, sans modification du fichier de test.

- [ ] **Step 4: Commit**

```bash
git add src/components/nav/BottomNav.tsx
git commit -m "style: refresh bottom nav visual polish"
```

---

### Task 3: Pages d'authentification et profil (lot)

**Files:**
- Modify: `src/app/connexion/page.tsx`
- Modify: `src/app/inscription/page.tsx`
- Modify: `src/app/mot-de-passe-oublie/page.tsx`
- Modify: `src/app/reinitialiser-mot-de-passe/[token]/page.tsx`
- Modify: `src/app/profil/page.tsx`
- Test: aucun test n'existe pour ces 5 fichiers *page* (les composants `*Form.tsx` qu'ils rendent ont leurs propres tests sous `tests/components/`, mais ces fichiers ne sont pas modifiés dans cette tâche — vérifier avec `grep -rl "ConnexionPage\|InscriptionPage\|MotDePasseOubliePage\|ReinitialiserMotDePassePage\|ProfilPage" tests/` avant de commencer).

**Interfaces:** Aucune — ces 5 fichiers ne touchent que leur propre page ; les composants `*Form.tsx` qu'ils importent ne sont PAS modifiés (ni leurs classes, ni leur comportement), donc aucun risque pour `tests/components/MotDePasseOublieForm.test.tsx` (le seul test de formulaire existant).

Motif commun appliqué aux 5 pages : le formulaire est enveloppé dans une carte blanche à bordure fine, centrée, largeur maximale `max-w-sm`, sur un fond `bg-gray-50`. Le titre `<h1>` migre à l'intérieur de la carte. Aucun texte, id, label ou `href` ne change.

- [ ] **Step 1: Vérifier l'absence de tests dédiés à ces pages**

Run: `grep -rl "ConnexionPage\|InscriptionPage\|MotDePasseOubliePage\|ReinitialiserMotDePassePage\|ProfilPage" tests/ 2>/dev/null || echo "aucun test trouvé"`

- [ ] **Step 2: Remplacer `src/app/connexion/page.tsx` par**

```tsx
import Link from "next/link";
import { ConnexionForm } from "@/components/forms/ConnexionForm";

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ inscription?: string; reinitialisation?: string }>;
}) {
  const params = await searchParams;
  const inscriptionReussie = params.inscription === "reussie";
  const reinitialisationReussie = params.reinitialisation === "reussie";

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h1 className="px-4 pt-6 text-center text-xl font-semibold text-anthracite">Se connecter</h1>
        {inscriptionReussie && (
          <p role="status" className="mx-4 mt-4 rounded bg-primary/10 px-3 py-2 text-sm text-primary">
            Votre compte a été créé avec succès. Vous pouvez vous connecter.
          </p>
        )}
        {reinitialisationReussie && (
          <p role="status" className="mx-4 mt-4 rounded bg-primary/10 px-3 py-2 text-sm text-primary">
            Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.
          </p>
        )}
        <ConnexionForm />
        <div className="flex flex-col gap-2 px-4 pb-6 text-sm text-anthracite">
          <Link href="/inscription" className="text-primary hover:underline">
            Pas encore de compte ? Créer un compte
          </Link>
          <Link href="/mot-de-passe-oublie" className="text-primary hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Remplacer `src/app/inscription/page.tsx` par**

```tsx
import Link from "next/link";
import { InscriptionForm } from "@/components/forms/InscriptionForm";

export default function InscriptionPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h1 className="px-4 pt-6 text-center text-xl font-semibold text-anthracite">Créer un compte</h1>
        <InscriptionForm />
        <div className="flex flex-col gap-2 px-4 pb-6 text-sm text-anthracite">
          <Link href="/connexion" className="text-primary hover:underline">
            J&apos;ai déjà un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Remplacer `src/app/mot-de-passe-oublie/page.tsx` par**

```tsx
import { MotDePasseOublieForm } from "@/components/forms/MotDePasseOublieForm";

export default function MotDePasseOubliePage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h1 className="px-4 pt-6 text-center text-xl font-semibold text-anthracite">Mot de passe oublié</h1>
        <MotDePasseOublieForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Remplacer `src/app/reinitialiser-mot-de-passe/[token]/page.tsx` par**

```tsx
import { ReinitialiserMotDePasseForm } from "@/components/forms/ReinitialiserMotDePasseForm";

export default async function ReinitialiserMotDePassePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h1 className="px-4 pt-6 text-center text-xl font-semibold text-anthracite">Nouveau mot de passe</h1>
        <ReinitialiserMotDePasseForm token={token} />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Remplacer `src/app/profil/page.tsx` par**

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilForm } from "@/components/forms/ProfilForm";
import { DeconnexionButton } from "@/components/auth/DeconnexionButton";

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
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h1 className="px-4 pt-6 text-center text-xl font-semibold text-anthracite">Mon profil</h1>
        <ProfilForm profile={profile} />
        <div className="px-4 pb-6">
          <DeconnexionButton />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Lancer la suite complète (ces pages ne sont pas unitairement testées, mais des tests d'intégration API ou de composants pourraient dépendre indirectement de leur structure)**

Run: `npm test`
Expected: tous les tests passent.

- [ ] **Step 8: Vérifier le build**

Run: `npm run build`
Expected: succès, les 5 routes toujours générées avec le bon type (statique/dynamique inchangé par rapport à avant).

- [ ] **Step 9: Commit**

```bash
git add src/app/connexion/page.tsx src/app/inscription/page.tsx src/app/mot-de-passe-oublie/page.tsx "src/app/reinitialiser-mot-de-passe/[token]/page.tsx" src/app/profil/page.tsx
git commit -m "style: wrap auth and profil pages in consistent card layout"
```

---

### Task 4: Liste des terrains

**Files:**
- Modify: `src/app/terrains/page.tsx`
- Modify: `src/components/terrains/TerrainCard.tsx`
- Modify: `src/components/terrains/TerrainFiltres.tsx`
- Test: `tests/components/TerrainCard.test.tsx`, `tests/components/TerrainFiltres.test.tsx` (existants, ne pas modifier)

**Interfaces:** Aucune dépendance externe à cette tâche. `TerrainCard` et `TerrainFiltres` ne sont utilisés que par `src/app/terrains/page.tsx`, modifié dans la même tâche.

- [ ] **Step 1: Remplacer `src/components/terrains/TerrainCard.tsx` par**

```tsx
import Link from "next/link";
import type { TerrainResume } from "@/lib/terrains/queries";
import { formatPrix, libelleFormat, libelleType } from "@/lib/terrains/format";

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
          <div
            role="presentation"
            aria-hidden="true"
            className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-gray-100 text-3xl text-gray-400"
          >
            ⚽
          </div>
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
        {libelleFormat(terrain.format)} · {libelleType(terrain.type)}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold text-primary">
          {formatPrix(terrain.prixParCreneau)}
        </span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Lancer le test du composant**

Run: `npx vitest run tests/components/TerrainCard.test.tsx`
Expected: 8/8 tests passent sans modification du fichier de test (le badge remplace l'ancien texte de bas de carte, mais le même texte — ex. « 3 créneaux libres » — reste présent une seule fois dans le rendu, ce que `getByText` trouve).

- [ ] **Step 3: Remplacer `src/components/terrains/TerrainFiltres.tsx` par**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type ValeursFiltres = {
  ville?: string;
  date?: string;
  heure?: string;
  format?: string;
  prixMax?: string;
};

/** Millimes (stockage/URL/API) → dinars (affichage dans le champ). */
function millimesVersDinars(millimes: string | undefined): string {
  if (!millimes) return "";
  const nombre = Number(millimes);
  if (Number.isNaN(nombre)) return "";
  return String(nombre / 1000);
}

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function TerrainFiltres({ valeurs }: { valeurs: ValeursFiltres }) {
  const router = useRouter();
  const [ville, setVille] = useState(valeurs.ville ?? "");
  const [date, setDate] = useState(valeurs.date ?? "");
  const [heure, setHeure] = useState(valeurs.heure ?? "");
  const [format, setFormat] = useState(valeurs.format ?? "");
  const [prixMaxDinars, setPrixMaxDinars] = useState(
    millimesVersDinars(valeurs.prixMax)
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    if (date) params.set("date", date);
    if (heure) params.set("heure", heure);
    if (format) params.set("format", format);

    // Le champ affiche des dinars ; l'URL et l'API attendent des millimes.
    const dinars = Number(prixMaxDinars);
    if (prixMaxDinars && !Number.isNaN(dinars)) {
      params.set("prixMax", String(Math.round(dinars * 1000)));
    }

    const query = params.toString();
    router.push(query ? `/terrains?${query}` : "/terrains");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-4 mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div>
        <label htmlFor="ville" className="block text-sm font-medium text-anthracite">Ville</label>
        <input
          id="ville"
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          placeholder="Tunis, Sfax, Sousse..."
          className={champClasse}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="date" className="block text-sm font-medium text-anthracite">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={champClasse}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="heure" className="block text-sm font-medium text-anthracite">Heure</label>
          <input
            id="heure"
            type="time"
            value={heure}
            onChange={(e) => setHeure(e.target.value)}
            className={champClasse}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="format" className="block text-sm font-medium text-anthracite">Format</label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={champClasse}
          >
            <option value="">Tous</option>
            <option value="cinq">5 contre 5</option>
            <option value="sept">7 contre 7</option>
            <option value="onze">11 contre 11</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="prixMax" className="block text-sm font-medium text-anthracite">
            Prix max (DT)
          </label>
          <input
            id="prixMax"
            type="number"
            min="0"
            value={prixMaxDinars}
            onChange={(e) => setPrixMaxDinars(e.target.value)}
            className={champClasse}
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark"
      >
        Rechercher
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Lancer le test du composant**

Run: `npx vitest run tests/components/TerrainFiltres.test.tsx`
Expected: 5/5 tests passent sans modification du fichier de test (aucun `id`, `label` ou comportement de soumission n'a changé).

- [ ] **Step 5: Remplacer `src/app/terrains/page.tsx` par**

```tsx
import { findTerrains } from "@/lib/terrains/queries";
import { terrainListQuerySchema } from "@/lib/validation/terrain";
import { TerrainCard } from "@/components/terrains/TerrainCard";
import { TerrainFiltres } from "@/components/terrains/TerrainFiltres";
import { normaliserSearchParamsRecord } from "@/lib/api/searchParams";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TerrainsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const brut = normaliserSearchParamsRecord(params);

  const parsed = terrainListQuerySchema.safeParse(brut);
  const query = parsed.success ? parsed.data : {};
  const terrains = await findTerrains(query);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-4">
      <h1 className="px-4 pt-6 text-xl font-semibold text-anthracite">Terrains</h1>

      <TerrainFiltres key={new URLSearchParams(brut).toString()} valeurs={brut} />

      {!parsed.success && (
        <p role="alert" className="mx-4 mt-4 text-sm text-red-600">
          Votre recherche contient un filtre invalide ; tous les terrains sont affichés sans filtre.
        </p>
      )}

      <div className="flex flex-col gap-3 px-4 pt-4">
        {terrains.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            Aucun terrain ne correspond à votre recherche.
          </p>
        ) : (
          terrains.map((terrain) => (
            <TerrainCard key={terrain.id} terrain={terrain} />
          ))
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Lancer la suite complète et le build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert.

- [ ] **Step 7: Commit**

```bash
git add src/app/terrains/page.tsx src/components/terrains/TerrainCard.tsx src/components/terrains/TerrainFiltres.tsx
git commit -m "style: refresh terrain list page, card and filters"
```

---

### Task 5: Fiche détail terrain

**Files:**
- Modify: `src/app/terrains/[id]/page.tsx`
- Modify: `src/components/terrains/CreneauxListe.tsx`
- Test: `tests/components/CreneauxListe.test.tsx` (existant, ne pas modifier)

**Interfaces:** Aucune dépendance externe. `CreneauxListe` n'est utilisé que par `src/app/terrains/[id]/page.tsx`, modifié dans la même tâche. **Note pour le sous-projet Réservations à venir :** cette tâche prépare la structure en grille que le sélecteur interactif consommera, mais ne rend rien de cliquable — le bouton « Réserver » de chaque créneau libre reste `disabled`.

- [ ] **Step 1: Remplacer `src/components/terrains/CreneauxListe.tsx` par**

```tsx
import type { Slot } from "@/lib/terrains/slots";

export function CreneauxListe({ creneaux }: { creneaux: Slot[] }) {
  if (creneaux.length === 0) {
    return (
      <p className="py-6 text-center text-gray-600">
        Aucun créneau pour cette date.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {creneaux.map((creneau) => (
        <li
          key={creneau.debut}
          className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center ${
            creneau.disponible
              ? "border-gray-200 bg-white"
              : "border-gray-100 bg-gray-50"
          }`}
        >
          <span
            className={`text-sm font-medium ${
              creneau.disponible ? "text-anthracite" : "text-gray-400 line-through"
            }`}
          >
            {creneau.debut} — {creneau.fin}
          </span>

          {creneau.disponible ? (
            <button
              type="button"
              disabled
              title="Réservation bientôt disponible"
              className="rounded bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              Réserver
            </button>
          ) : (
            <span className="text-xs text-gray-500">Réservé</span>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Lancer le test du composant**

Run: `npx vitest run tests/components/CreneauxListe.test.tsx`
Expected: 4/4 tests passent sans modification du fichier de test (le texte « 08:00 — 09:30 », le rôle bouton désactivé, et le texte « Réservé » sont tous préservés — seule la disposition devient une grille).

- [ ] **Step 3: Remplacer `src/app/terrains/[id]/page.tsx` par**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import type { Metadata } from "next";
import { findTerrainById } from "@/lib/terrains/queries";
import { terrainDetailQuerySchema } from "@/lib/validation/terrain";
import { CreneauxListe } from "@/components/terrains/CreneauxListe";
import {
  formatPrix,
  libelleEquipement,
  libelleFormat,
  libelleType,
} from "@/lib/terrains/format";
import { normaliserSearchParamsRecord } from "@/lib/api/searchParams";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const getTerrain = cache((id: string, date?: string) => findTerrainById(id, date));

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

export default async function TerrainDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;

  const brut = normaliserSearchParamsRecord(query);
  const parsed = terrainDetailQuerySchema.safeParse(brut);

  const terrain = await getTerrain(id, parsed.success ? parsed.data.date : undefined);
  if (!terrain) notFound();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 pb-6 pt-6">
      <Link href="/terrains" className="text-sm text-primary hover:underline">
        ← Retour aux terrains
      </Link>

      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {terrain.photos[0] ? (
          <img
            src={terrain.photos[0]}
            alt={terrain.nom}
            className="h-40 w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            role="presentation"
            aria-hidden="true"
            className="flex h-40 w-full items-center justify-center bg-gray-100 text-4xl text-gray-400"
          >
            ⚽
          </div>
        )}

        <div className="p-4">
          <h1 className="text-xl font-semibold text-anthracite">{terrain.nom}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {terrain.adresse}, {terrain.ville}
          </p>

          {terrain.description && (
            <p className="mt-3 text-sm text-anthracite">{terrain.description}</p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-600">Format</dt>
              <dd className="font-medium text-anthracite">{libelleFormat(terrain.format)}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Surface</dt>
              <dd className="font-medium text-anthracite">{libelleType(terrain.type)}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Tarif</dt>
              <dd className="font-medium text-primary">
                {formatPrix(terrain.prixParCreneau)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600">Durée</dt>
              <dd className="font-medium text-anthracite">{terrain.dureeCreneauMinutes} minutes</dd>
            </div>
          </dl>

          {terrain.equipements.length > 0 && (
            <section className="mt-4">
              <h2 className="text-sm font-semibold text-anthracite">Équipements</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {terrain.equipements.map((equipement) => (
                  <li
                    key={equipement}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-anthracite"
                  >
                    {libelleEquipement(equipement)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-anthracite">Créneaux</h2>

        {brut.date && !parsed.success && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            Date invalide ; les créneaux d&apos;aujourd&apos;hui sont affichés.
          </p>
        )}

        <form method="get" className="mt-2 flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="date" className="block text-xs text-gray-600">
              Choisir une date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={terrain.date}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Afficher
          </button>
        </form>

        <div className="mt-3">
          <CreneauxListe creneaux={terrain.creneaux} />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          La réservation en ligne arrive bientôt.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Lancer la suite complète et le build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert, `/terrains/[id]` toujours dynamique (`ƒ`).

- [ ] **Step 5: Commit**

```bash
git add "src/app/terrains/[id]/page.tsx" src/components/terrains/CreneauxListe.tsx
git commit -m "style: refresh terrain detail page and slot grid"
```

---

### Task 6: Pages stub et tableau de bord (lot)

**Files:**
- Modify: `src/app/joueurs/page.tsx`
- Modify: `src/app/matchs/page.tsx`
- Modify: `src/app/tableau-de-bord/page.tsx`
- Test: aucun test dédié (vérifier avec `grep -rl "JoueursPage\|MatchsPage\|TableauDeBordPage" tests/` avant de commencer).

**Interfaces:** Aucune. **Important :** le texte de `tableau-de-bord/page.tsx` (« Vos réservations et matchs apparaîtront ici bientôt ») **ne change pas** — seul le conteneur visuel change — pour éviter tout conflit avec le sous-projet Réservations qui remplacera ce texte par la vraie liste juste après.

- [ ] **Step 1: Vérifier l'absence de tests dédiés**

Run: `grep -rl "JoueursPage\|MatchsPage\|TableauDeBordPage" tests/ 2>/dev/null || echo "aucun test trouvé"`

- [ ] **Step 2: Remplacer `src/app/joueurs/page.tsx` par**

```tsx
export default function JoueursPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gray-50 px-4 py-10 text-center">
      <h1 className="text-xl font-semibold text-anthracite">Joueurs</h1>
      <p className="mt-2 text-gray-600">Cette page arrive bientôt.</p>
    </main>
  );
}
```

- [ ] **Step 3: Remplacer `src/app/matchs/page.tsx` par**

```tsx
export default function MatchsPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gray-50 px-4 py-10 text-center">
      <h1 className="text-xl font-semibold text-anthracite">Matchs</h1>
      <p className="mt-2 text-gray-600">Cette page arrive bientôt.</p>
    </main>
  );
}
```

- [ ] **Step 4: Remplacer `src/app/tableau-de-bord/page.tsx` par**

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function TableauDeBordPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10">
      <h1 className="text-xl font-semibold text-anthracite">Tableau de bord</h1>
      <p className="mt-2 text-gray-600">
        Bienvenue {session.user.email}. Vos réservations et matchs apparaîtront ici bientôt.
      </p>
    </main>
  );
}
```

- [ ] **Step 5: Lancer la suite complète et le build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert.

- [ ] **Step 6: Commit**

```bash
git add src/app/joueurs/page.tsx src/app/matchs/page.tsx src/app/tableau-de-bord/page.tsx
git commit -m "style: refresh stub pages and dashboard container"
```

---

## Self-Review Notes (controller-facing, not a task)

- **Spec coverage:** tokens (aucun nouveau nécessaire, documenté), accueil (Task 1), auth+profil (Task 3), terrains liste+détail (Task 4+5), nav (Task 2), stubs+tableau de bord (Task 6) — toutes les zones du tableau de la spec sont couvertes.
- **Aucun placeholder :** chaque step contient le fichier complet à écrire, aucun « TODO ».
- **Cohérence de types :** aucun nouveau type introduit ; tous les imports/exports existants (`TerrainResume`, `Slot`, `ValeursFiltres`, etc.) sont préservés à l'identique.
- **Risque de régression de test :** vérifié fichier par fichier ci-dessus contre les 4 fichiers de test existants qui touchent ces composants (`BottomNav`, `TerrainCard`, `TerrainFiltres`, `CreneauxListe`) — tous préservent exactement le texte, les rôles ARIA et les `id`/`label` testés.
