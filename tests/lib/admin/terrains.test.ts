import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  findAdminTerrains,
  updateAdminTerrainStatut,
  deleteAdminTerrain,
} from "@/lib/admin/terrains";

async function creerTerrain(overrides: { ownerId?: string | null; nom?: string } = {}) {
  return prisma.terrain.create({
    data: {
      nom: overrides.nom ?? "Terrain Test",
      adresse: "Adresse",
      ville: "Tunis",
      type: "gazon_synthetique",
      ownerId: overrides.ownerId ?? null,
      formats: { create: [{ format: "cinq", capacite: 10, prixParCreneau: 50000 }] },
    },
  });
}

describe("findAdminTerrains", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("includes demo terrains (ownerId null)", async () => {
    await creerTerrain({ ownerId: null });
    const resultats = await findAdminTerrains();
    expect(resultats).toHaveLength(1);
    expect(resultats[0].ownerId).toBeNull();
    expect(resultats[0].ownerEmail).toBeNull();
  });

  it("includes the owner email for owned terrains", async () => {
    const owner = await prisma.user.create({
      data: {
        email: "owner@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        role: "proprietaire",
      },
    });
    await creerTerrain({ ownerId: owner.id });

    const resultats = await findAdminTerrains();
    expect(resultats[0].ownerEmail).toBe("owner@example.com");
  });
});

describe("updateAdminTerrainStatut", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("updates the statut", async () => {
    const terrain = await creerTerrain();
    const resultat = await updateAdminTerrainStatut(terrain.id, "suspendu");
    expect(resultat).toEqual({ ok: true });

    const misAJour = await prisma.terrain.findUniqueOrThrow({ where: { id: terrain.id } });
    expect(misAJour.statut).toBe("suspendu");
  });

  it("returns introuvable for an unknown id", async () => {
    expect(await updateAdminTerrainStatut("inconnu", "actif")).toEqual({
      ok: false,
      raison: "introuvable",
    });
  });
});

describe("deleteAdminTerrain", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("deletes the terrain", async () => {
    const terrain = await creerTerrain();
    const resultat = await deleteAdminTerrain(terrain.id);
    expect(resultat).toEqual({ ok: true });
    expect(await prisma.terrain.findUnique({ where: { id: terrain.id } })).toBeNull();
  });

  it("returns introuvable for an unknown id", async () => {
    expect(await deleteAdminTerrain("inconnu")).toEqual({ ok: false, raison: "introuvable" });
  });
});
