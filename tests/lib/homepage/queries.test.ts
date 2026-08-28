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
