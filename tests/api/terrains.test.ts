import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { GET as listGET } from "@/app/api/terrains/route";
import { GET as detailGET } from "@/app/api/terrains/[id]/route";

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
    const response = await listGET(listRequest("?format=neuf"));
    expect(response.status).toBe(400);
  });

  it("rejects a malformed date with 400", async () => {
    const response = await listGET(listRequest("?date=07-09-2026"));
    expect(response.status).toBe(400);
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
});
