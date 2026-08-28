import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import { findAdminAnnulations } from "@/lib/admin/annulations";

async function creerTerrain(nom: string) {
  return prisma.terrain.create({
    data: {
      nom,
      adresse: "Adresse",
      ville: "Tunis",
      type: "gazon_synthetique",
      formats: { create: [{ format: "cinq", capacite: 10, prixParCreneau: 50000 }] },
    },
  });
}

async function creerUtilisateur(email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

describe("findAdminAnnulations", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("describes a match cancellation", async () => {
    const terrain = await creerTerrain("Terrain A");
    const user = await creerUtilisateur("u1@example.com");
    const match = await prisma.match.create({
      data: {
        terrainId: terrain.id,
        organisateurId: user.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
        statut: "annule",
      },
    });
    await prisma.annulation.create({
      data: { matchId: match.id, userId: user.id, raison: "personnel" },
    });

    const resultats = await findAdminAnnulations();
    expect(resultats).toHaveLength(1);
    expect(resultats[0].type).toBe("match");
    expect(resultats[0].cible).toContain("Terrain A");
    expect(resultats[0].userEmail).toBe("u1@example.com");
  });

  it("describes a reservation cancellation", async () => {
    const terrain = await creerTerrain("Terrain B");
    const user = await creerUtilisateur("u2@example.com");
    const reservation = await prisma.reservation.create({
      data: {
        terrainId: terrain.id,
        userId: user.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
        statut: "annulee",
        canceledAt: new Date(),
      },
    });
    await prisma.annulation.create({
      data: { reservationId: reservation.id, userId: user.id, raison: "conflit_horaire" },
    });

    const resultats = await findAdminAnnulations();
    expect(resultats[0].type).toBe("reservation");
    expect(resultats[0].cible).toContain("Terrain B");
  });

  it("includes raisonAutre when present", async () => {
    const terrain = await creerTerrain("Terrain C");
    const user = await creerUtilisateur("u3@example.com");
    const match = await prisma.match.create({
      data: {
        terrainId: terrain.id,
        organisateurId: user.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
        statut: "annule",
      },
    });
    await prisma.annulation.create({
      data: {
        matchId: match.id,
        userId: user.id,
        raison: "autre",
        raisonAutre: "Pluie torrentielle",
      },
    });

    const resultats = await findAdminAnnulations();
    expect(resultats[0].raisonAutre).toBe("Pluie torrentielle");
  });

  it("returns an empty list when there are no cancellations", async () => {
    expect(await findAdminAnnulations()).toEqual([]);
  });
});
