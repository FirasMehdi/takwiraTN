import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { findTerrains, findTerrainById } from "@/lib/terrains/queries";

// 2026-09-07 is a Monday.
const LUNDI_TOT = new Date(2026, 8, 7, 6, 0);

async function creerTerrain(overrides: Record<string, unknown> = {}) {
  return prisma.terrain.create({
    data: {
      nom: "Terrain Test",
      adresse: "Rue Test",
      ville: "Tunis",
      type: "gazon_synthetique",
      format: "cinq",
      prixParCreneau: 60000,
      dureeCreneauMinutes: 90,
      equipements: [],
      photos: [],
      horaires: { create: [{ jourSemaine: 1, ouvre: "08:00", ferme: "11:00" }] },
      ...overrides,
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
});
