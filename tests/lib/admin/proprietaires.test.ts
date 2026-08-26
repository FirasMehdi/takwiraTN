import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  findAdminProprietaires,
  findAdminProprietaireById,
  deleteAdminProprietaire,
} from "@/lib/admin/proprietaires";

async function creerProprietaire(email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role: "proprietaire",
    },
  });
}

async function creerTerrainPour(ownerId: string | null, nom: string) {
  return prisma.terrain.create({
    data: {
      nom,
      adresse: "Adresse",
      ville: "Tunis",
      type: "gazon_synthetique",
      ownerId,
      formats: { create: [{ format: "cinq", capacite: 10, prixParCreneau: 50000 }] },
    },
  });
}

describe("findAdminProprietaires", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists proprietaires with their terrain count", async () => {
    const owner = await creerProprietaire("owner@example.com");
    await creerTerrainPour(owner.id, "Terrain A");
    await creerTerrainPour(owner.id, "Terrain B");

    const resultats = await findAdminProprietaires();
    expect(resultats).toHaveLength(1);
    expect(resultats[0].nombreTerrains).toBe(2);
  });

  it("excludes non-proprietaire roles", async () => {
    await prisma.user.create({
      data: {
        email: "joueur@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "J", ville: "Tunis" } },
      },
    });
    expect(await findAdminProprietaires()).toHaveLength(0);
  });

  it("filters by email substring, case-insensitively", async () => {
    await creerProprietaire("owner@example.com");
    await creerProprietaire("other@example.com");
    const resultats = await findAdminProprietaires("OWNER");
    expect(resultats.map((r) => r.email)).toEqual(["owner@example.com"]);
  });
});

describe("findAdminProprietaireById", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns the owner's terrains", async () => {
    const owner = await creerProprietaire("owner2@example.com");
    await creerTerrainPour(owner.id, "Terrain X");

    const detail = await findAdminProprietaireById(owner.id);
    expect(detail?.terrains).toHaveLength(1);
    expect(detail?.terrains[0].nom).toBe("Terrain X");
  });

  it("returns null for an unknown id", async () => {
    expect(await findAdminProprietaireById("inconnu")).toBeNull();
  });

  it("returns null for a non-proprietaire role", async () => {
    const user = await prisma.user.create({
      data: {
        email: "j2@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "J", ville: "Tunis" } },
      },
    });
    expect(await findAdminProprietaireById(user.id)).toBeNull();
  });
});

describe("deleteAdminProprietaire", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("deletes the user and detaches (not deletes) their terrains", async () => {
    const owner = await creerProprietaire("owner3@example.com");
    const terrain = await creerTerrainPour(owner.id, "Terrain Y");

    const resultat = await deleteAdminProprietaire(owner.id);
    expect(resultat).toEqual({ ok: true });

    expect(await prisma.user.findUnique({ where: { id: owner.id } })).toBeNull();
    const terrainRestant = await prisma.terrain.findUniqueOrThrow({ where: { id: terrain.id } });
    expect(terrainRestant.ownerId).toBeNull();
  });

  it("returns introuvable for an unknown id", async () => {
    expect(await deleteAdminProprietaire("inconnu")).toEqual({ ok: false, raison: "introuvable" });
  });
});
