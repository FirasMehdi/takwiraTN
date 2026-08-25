import { describe, it, expect, beforeEach, afterAll } from "vitest";
import type { FormatEquipe } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { findTerrains, findTerrainById } from "@/lib/terrains/queries";
import { hashPassword } from "@/lib/password";

// 2026-09-07 is a Monday.
const LUNDI_TOT = new Date(2026, 8, 7, 6, 0);

const CAPACITES: Record<FormatEquipe, number> = {
  quatre: 8,
  cinq: 10,
  six: 12,
  sept: 14,
  huit: 16,
  neuf: 18,
  onze: 22,
};

async function creerTerrain(overrides: Record<string, unknown> = {}) {
  const { format, prixParCreneau, ...reste } = overrides;
  const formatValeur = (format as FormatEquipe | undefined) ?? "cinq";
  return prisma.terrain.create({
    data: {
      nom: "Terrain Test",
      adresse: "Rue Test",
      ville: "Tunis",
      type: "gazon_synthetique",
      dureeCreneauMinutes: 90,
      equipements: [],
      photos: [],
      formats: {
        create: [
          {
            format: formatValeur,
            capacite: CAPACITES[formatValeur],
            prixParCreneau: (prixParCreneau as number | undefined) ?? 60000,
          },
        ],
      },
      horaires: { create: [{ jourSemaine: 1, ouvre: "08:00", ferme: "11:00" }] },
      ...reste,
    },
  });
}

describe("findTerrains", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns active terrains with their free slot count", async () => {
    await creerTerrain();

    const resultats = await findTerrains({ date: "2026-09-07" }, LUNDI_TOT);

    expect(resultats).toHaveLength(1);
    expect(resultats[0].creneauxLibres).toBe(2);
  });

  it("excludes terrains that are not active", async () => {
    await creerTerrain({ statut: "en_attente" });

    const resultats = await findTerrains({}, LUNDI_TOT);
    expect(resultats).toHaveLength(0);
  });

  it("filters by ville, case-insensitively", async () => {
    await creerTerrain({ nom: "A", ville: "Tunis" });
    await creerTerrain({ nom: "B", ville: "Sfax" });

    const resultats = await findTerrains({ ville: "tunis" }, LUNDI_TOT);
    expect(resultats.map((t) => t.nom)).toEqual(["A"]);
  });

  it("filters by format", async () => {
    await creerTerrain({ nom: "A", format: "cinq" });
    await creerTerrain({ nom: "B", format: "onze" });

    const resultats = await findTerrains({ format: "onze" }, LUNDI_TOT);
    expect(resultats.map((t) => t.nom)).toEqual(["B"]);
  });

  it("filters by maximum price", async () => {
    await creerTerrain({ nom: "Cher", prixParCreneau: 120000 });
    await creerTerrain({ nom: "Abordable", prixParCreneau: 40000 });

    const resultats = await findTerrains({ prixMax: 60000 }, LUNDI_TOT);
    expect(resultats.map((t) => t.nom)).toEqual(["Abordable"]);
  });

  it("filters by heure — only terrains with that slot free", async () => {
    await creerTerrain({ nom: "Matin", horaires: { create: [{ jourSemaine: 1, ouvre: "08:00", ferme: "11:00" }] } });
    await creerTerrain({ nom: "Soir", horaires: { create: [{ jourSemaine: 1, ouvre: "18:00", ferme: "21:00" }] } });

    const resultats = await findTerrains({ date: "2026-09-07", heure: "18:00" }, LUNDI_TOT);
    expect(resultats.map((t) => t.nom)).toEqual(["Soir"]);
  });

  it("returns a zero slot count on a day the terrain is closed", async () => {
    // Mardi 2026-09-08 — le terrain n'ouvre que le lundi.
    await creerTerrain();

    const resultats = await findTerrains({ date: "2026-09-08" }, new Date(2026, 8, 8, 6, 0));
    expect(resultats[0].creneauxLibres).toBe(0);
  });

  it("filters by heure — matches slots by containment, not just exact start", async () => {
    await creerTerrain({
      nom: "ContainmentTest",
      horaires: { create: [{ jourSemaine: 1, ouvre: "18:00", ferme: "19:30" }] },
    });

    // 18:15 falls within the 18:00-19:30 slot
    const resultats = await findTerrains(
      { date: "2026-09-07", heure: "18:15" },
      LUNDI_TOT
    );
    expect(resultats.map((t) => t.nom)).toEqual(["ContainmentTest"]);
  });

  it("filters by heure — excludes slots where the requested time is at or past the end", async () => {
    await creerTerrain({
      nom: "BoundaryTest",
      horaires: { create: [{ jourSemaine: 1, ouvre: "18:00", ferme: "19:30" }] },
    });

    // 19:30 is the end boundary and should not match (end boundary is exclusive)
    const resultats = await findTerrains(
      { date: "2026-09-07", heure: "19:30" },
      LUNDI_TOT
    );
    expect(resultats).toHaveLength(0);
  });

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
});

describe("findTerrainById", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns the terrain with slots for the requested date", async () => {
    const terrain = await creerTerrain();

    const resultat = await findTerrainById(terrain.id, "2026-09-07", LUNDI_TOT);

    expect(resultat?.nom).toBe("Terrain Test");
    expect(resultat?.creneaux.map((c) => c.debut)).toEqual(["08:00", "09:30"]);
  });

  it("returns null for an unknown id", async () => {
    const resultat = await findTerrainById("inexistant", "2026-09-07", LUNDI_TOT);
    expect(resultat).toBeNull();
  });

  it("returns null for a terrain that is not active", async () => {
    const terrain = await creerTerrain({ statut: "suspendu" });

    const resultat = await findTerrainById(terrain.id, "2026-09-07", LUNDI_TOT);
    expect(resultat).toBeNull();
  });

  it("defaults to today when no date is given", async () => {
    const terrain = await creerTerrain();

    const resultat = await findTerrainById(terrain.id, undefined, LUNDI_TOT);
    expect(resultat?.date).toBe("2026-09-07");
  });

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
});
