import { describe, it, expect, beforeEach, afterAll } from "vitest";
import type { FormatEquipe } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { GET as listGET } from "@/app/api/terrains/route";
import { GET as detailGET } from "@/app/api/terrains/[id]/route";

async function creerTerrain(overrides: Record<string, unknown> = {}) {
  const { format, prixParCreneau, ...reste } = overrides;
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
            format: (format as FormatEquipe | undefined) ?? "cinq",
            capacite: 10,
            prixParCreneau: (prixParCreneau as number | undefined) ?? 60000,
          },
        ],
      },
      horaires: { create: [{ jourSemaine: 1, ouvre: "08:00", ferme: "11:00" }] },
      ...reste,
    },
  });
}

function listRequest(query = "") {
  return new Request(`http://localhost/api/terrains${query}`);
}

function detailRequest(id: string, query = "") {
  return new Request(`http://localhost/api/terrains/${id}${query}`);
}

describe("GET /api/terrains", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns the list of active terrains", async () => {
    await creerTerrain();

    const response = await listGET(listRequest());
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.terrains).toHaveLength(1);
    expect(body.terrains[0].nom).toBe("Terrain Test");
  });

  it("applies the ville filter", async () => {
    await creerTerrain({ nom: "A", ville: "Tunis" });
    await creerTerrain({ nom: "B", ville: "Sfax" });

    const response = await listGET(listRequest("?ville=Sfax"));
    const body = await response.json();

    expect(body.terrains.map((t: { nom: string }) => t.nom)).toEqual(["B"]);
  });

  it("rejects an invalid query with 400", async () => {
    const response = await listGET(listRequest("?format=vingt-deux"));
    expect(response.status).toBe(400);
  });

  it("rejects a malformed date with 400", async () => {
    const response = await listGET(listRequest("?date=07-09-2026"));
    expect(response.status).toBe(400);
  });

  it("strips an empty ville param instead of rejecting it", async () => {
    await creerTerrain();

    const response = await listGET(listRequest("?ville="));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.terrains).toHaveLength(1);
  });

  it("treats prixMax=0 as a real filter value, not an empty param to strip", async () => {
    await creerTerrain({ prixParCreneau: 60000 });

    const response = await listGET(listRequest("?prixMax=0"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.terrains).toHaveLength(0);
  });
});

describe("GET /api/terrains/[id]", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns the terrain detail with its slots", async () => {
    const terrain = await creerTerrain();

    const response = await detailGET(detailRequest(terrain.id, "?date=2026-09-07"), {
      params: Promise.resolve({ id: terrain.id }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.nom).toBe("Terrain Test");
    expect(Array.isArray(body.creneaux)).toBe(true);
  });

  it("returns 404 for an unknown terrain", async () => {
    const response = await detailGET(detailRequest("inexistant"), {
      params: Promise.resolve({ id: "inexistant" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 404 for a terrain that is not active", async () => {
    const terrain = await creerTerrain({ statut: "suspendu" });

    const response = await detailGET(detailRequest(terrain.id), {
      params: Promise.resolve({ id: terrain.id }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects a malformed date with 400", async () => {
    const terrain = await creerTerrain();

    const response = await detailGET(detailRequest(terrain.id, "?date=hier"), {
      params: Promise.resolve({ id: terrain.id }),
    });

    expect(response.status).toBe(400);
  });

  it("treats an empty date param the same as an omitted one (defaults to today)", async () => {
    const terrain = await creerTerrain();

    const avecDateVide = await detailGET(detailRequest(terrain.id, "?date="), {
      params: Promise.resolve({ id: terrain.id }),
    });
    const sansDate = await detailGET(detailRequest(terrain.id), {
      params: Promise.resolve({ id: terrain.id }),
    });

    expect(avecDateVide.status).toBe(200);
    expect(sansDate.status).toBe(200);

    const corpsAvecDateVide = await avecDateVide.json();
    const corpsSansDate = await sansDate.json();
    expect(corpsAvecDateVide.date).toBe(corpsSansDate.date);
  });
});
