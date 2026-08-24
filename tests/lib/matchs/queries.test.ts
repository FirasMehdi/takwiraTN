import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  creerMatch,
  rejoindreMatch,
  quitterMatch,
  annulerMatch,
  findMatchs,
  findMatchById,
} from "@/lib/matchs/queries";

async function creerTerrain() {
  return prisma.terrain.create({
    data: {
      nom: "Terrain Test",
      adresse: "Adresse",
      ville: "Tunis",
      type: "gazon_synthetique",
      format: "cinq",
      prixParCreneau: 50000,
    },
  });
}

async function creerUtilisateur(email: string, prenom = "Joueur") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom, ville: "Tunis" } },
    },
  });
}

describe("matchs/queries", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a match with the organizer as the first participant", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");

    const { id } = await creerMatch({
      terrainId: terrain.id,
      organisateurId: organisateur.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 10,
    });

    const detail = await findMatchById(id);
    expect(detail?.joueursInscrits).toBe(1);
    expect(detail?.participants[0].userId).toBe(organisateur.id);
    expect(detail?.statut).toBe("ouvert");
  });

  it("lets another player join an open match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatch({
      terrainId: terrain.id,
      organisateurId: organisateur.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 2,
    });

    const joueur = await creerUtilisateur("j@example.com");
    const resultat = await rejoindreMatch(id, joueur.id);

    expect(resultat).toEqual({ ok: true });
    const detail = await findMatchById(id);
    expect(detail?.joueursInscrits).toBe(2);
    expect(detail?.statut).toBe("complet");
  });

  it("rejects joining twice", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatch({
      terrainId: terrain.id,
      organisateurId: organisateur.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 10,
    });

    const resultat = await rejoindreMatch(id, organisateur.id);
    expect(resultat).toEqual({ ok: false, raison: "deja_inscrit" });
  });

  it("rejects joining a full match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatch({
      terrainId: terrain.id,
      organisateurId: organisateur.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 1,
    });

    const joueur = await creerUtilisateur("j@example.com");
    const resultat = await rejoindreMatch(id, joueur.id);
    expect(resultat).toEqual({ ok: false, raison: "complet" });
  });

  it("allows exactly one of two players joining the last spot simultaneously", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatch({
      terrainId: terrain.id,
      organisateurId: organisateur.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 2, // organisateur + une place restante
    });

    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    const [resultatA, resultatB] = await Promise.all([
      rejoindreMatch(id, userA.id),
      rejoindreMatch(id, userB.id),
    ]);

    const succes = [resultatA, resultatB].filter((r) => r.ok);
    expect(succes).toHaveLength(1);

    const total = await prisma.matchParticipant.count({ where: { matchId: id } });
    expect(total).toBe(2);
  });

  it("lets a participant leave, which reopens a full match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatch({
      terrainId: terrain.id,
      organisateurId: organisateur.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 2,
    });
    const joueur = await creerUtilisateur("j@example.com");
    await rejoindreMatch(id, joueur.id);

    const resultat = await quitterMatch(id, joueur.id);
    expect(resultat).toEqual({ ok: true });

    const detail = await findMatchById(id);
    expect(detail?.joueursInscrits).toBe(1);
    expect(detail?.statut).toBe("ouvert");
  });

  it("lets the organizer cancel the match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatch({
      terrainId: terrain.id,
      organisateurId: organisateur.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 10,
    });

    const resultat = await annulerMatch(id, organisateur.id);
    expect(resultat).toEqual({ ok: true });

    const detail = await findMatchById(id);
    expect(detail?.statut).toBe("annule");
  });

  it("refuses to let a non-organizer cancel the match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatch({
      terrainId: terrain.id,
      organisateurId: organisateur.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 10,
    });
    const autre = await creerUtilisateur("autre@example.com");

    const resultat = await annulerMatch(id, autre.id);
    expect(resultat).toEqual({ ok: false, raison: "non_autorise" });
  });

  it("excludes cancelled matches from findMatchs", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatch({
      terrainId: terrain.id,
      organisateurId: organisateur.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 10,
    });
    await annulerMatch(id, organisateur.id);

    const resultats = await findMatchs({});
    expect(resultats).toHaveLength(0);
  });
});
