import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import { getDashboardStats } from "@/lib/admin/dashboard";

async function creerUtilisateur(role: "joueur" | "proprietaire" | "administrateur", email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
      ...(role === "joueur"
        ? { profile: { create: { prenom: "Test", ville: "Tunis" } } }
        : {}),
    },
  });
}

async function creerTerrain(statut: "actif" | "en_attente" | "suspendu", nom: string) {
  return prisma.terrain.create({
    data: {
      nom,
      adresse: "Adresse",
      ville: "Tunis",
      type: "gazon_synthetique",
      statut,
      formats: { create: [{ format: "cinq", capacite: 10, prixParCreneau: 50000 }] },
    },
  });
}

describe("getDashboardStats", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("counts users by role", async () => {
    await creerUtilisateur("joueur", "j1@example.com");
    await creerUtilisateur("joueur", "j2@example.com");
    await creerUtilisateur("proprietaire", "p1@example.com");

    const stats = await getDashboardStats();
    expect(stats.totalJoueurs).toBe(2);
    expect(stats.totalProprietaires).toBe(1);
  });

  it("counts terrains by statut", async () => {
    await creerTerrain("actif", "A");
    await creerTerrain("actif", "B");
    await creerTerrain("en_attente", "C");
    await creerTerrain("suspendu", "D");

    const stats = await getDashboardStats();
    expect(stats.totalTerrains).toBe(4);
    expect(stats.terrainsParStatut).toEqual({ actif: 2, en_attente: 1, suspendu: 1 });
  });

  it("counts matchs by statut", async () => {
    const terrain = await creerTerrain("actif", "Terrain Match");
    const organisateur = await creerUtilisateur("joueur", "org@example.com");
    await prisma.match.create({
      data: {
        terrainId: terrain.id,
        organisateurId: organisateur.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
        statut: "ouvert",
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

    const stats = await getDashboardStats();
    expect(stats.totalMatchs).toBe(2);
    expect(stats.matchsParStatut).toEqual({ ouvert: 1, complet: 0, annule: 1 });
  });

  it("returns the given moment as maintenant", async () => {
    const moment = new Date("2026-08-26T12:00:00.000Z");
    const stats = await getDashboardStats(moment);
    expect(stats.maintenant).toBe(moment);
  });
});
