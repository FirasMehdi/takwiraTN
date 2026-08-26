import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import { findAdminMatchs, annulerMatchAdmin } from "@/lib/admin/matchs";

async function creerTerrain() {
  return prisma.terrain.create({
    data: {
      nom: "Terrain Test",
      adresse: "Adresse",
      ville: "Tunis",
      type: "gazon_synthetique",
      formats: { create: [{ format: "cinq", capacite: 10, prixParCreneau: 50000 }] },
    },
  });
}

async function creerUtilisateur(email: string, role: "joueur" | "administrateur" = "joueur") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
      ...(role === "joueur" ? { profile: { create: { prenom: "Test", ville: "Tunis" } } } : {}),
    },
  });
}

async function creerMatch(terrainId: string, organisateurId: string, statut: "ouvert" | "complet" | "annule" = "ouvert") {
  return prisma.match.create({
    data: {
      terrainId,
      organisateurId,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 10,
      statut,
    },
  });
}

describe("findAdminMatchs", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("includes matches of every statut with participant counts", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    const match = await creerMatch(terrain.id, org.id);
    await prisma.matchParticipant.create({ data: { matchId: match.id, userId: org.id } });

    const resultats = await findAdminMatchs();
    expect(resultats).toHaveLength(1);
    expect(resultats[0].joueursInscrits).toBe(1);
    expect(resultats[0].organisateurEmail).toBe("org@example.com");
  });
});

describe("annulerMatchAdmin", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates an Annulation row and sets statut to annule", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org2@example.com");
    const admin = await creerUtilisateur("admin@example.com", "administrateur");
    const match = await creerMatch(terrain.id, org.id);

    const resultat = await annulerMatchAdmin({
      matchId: match.id,
      adminId: admin.id,
      raison: "terrain_indisponible",
    });
    expect(resultat).toEqual({ ok: true });

    const misAJour = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(misAJour.statut).toBe("annule");

    const annulation = await prisma.annulation.findUniqueOrThrow({ where: { matchId: match.id } });
    expect(annulation.userId).toBe(admin.id);
    expect(annulation.raison).toBe("terrain_indisponible");
  });

  it("stores raisonAutre only when raison is autre", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org3@example.com");
    const admin = await creerUtilisateur("admin2@example.com", "administrateur");
    const match = await creerMatch(terrain.id, org.id);

    await annulerMatchAdmin({
      matchId: match.id,
      adminId: admin.id,
      raison: "autre",
      raisonAutre: "Terrain inondé",
    });

    const annulation = await prisma.annulation.findUniqueOrThrow({ where: { matchId: match.id } });
    expect(annulation.raisonAutre).toBe("Terrain inondé");
  });

  it("returns introuvable for an unknown match", async () => {
    const admin = await creerUtilisateur("admin3@example.com", "administrateur");
    const resultat = await annulerMatchAdmin({
      matchId: "inconnu",
      adminId: admin.id,
      raison: "personnel",
    });
    expect(resultat).toEqual({ ok: false, raison: "introuvable" });
  });

  it("returns deja_annule for an already-cancelled match", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org4@example.com");
    const admin = await creerUtilisateur("admin4@example.com", "administrateur");
    const match = await creerMatch(terrain.id, org.id, "annule");

    const resultat = await annulerMatchAdmin({
      matchId: match.id,
      adminId: admin.id,
      raison: "personnel",
    });
    expect(resultat).toEqual({ ok: false, raison: "deja_annule" });
  });
});
