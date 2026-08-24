import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  creerReservation,
  annulerReservation,
  findReservationsForUser,
  findTakenSlots,
} from "@/lib/reservations/queries";

async function creerTerrain() {
  return prisma.terrain.create({
    data: {
      nom: "Terrain Test",
      adresse: "Adresse",
      ville: "Tunis",
      type: "gazon_synthetique",
      format: "cinq",
      prixParCreneau: 50000,
      horaires: { create: [{ jourSemaine: 1, ouvre: "08:00", ferme: "20:00" }] },
    },
  });
}

async function creerUtilisateur(email: string) {
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword("motdepasse123") },
  });
}

describe("reservations/queries", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a reservation and it shows up as taken", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");

    const resultat = await creerReservation({
      terrainId: terrain.id,
      userId: user.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
    });

    expect(resultat.ok).toBe(true);
    const pris = await findTakenSlots(terrain.id, "2026-09-07");
    expect(pris).toEqual(["18:00"]);
  });

  it("rejects a second reservation on the same slot", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    await creerReservation({
      terrainId: terrain.id, userId: userA.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    const resultat = await creerReservation({
      terrainId: terrain.id, userId: userB.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });

    expect(resultat).toEqual({ ok: false, raison: "conflit" });
  });

  it("allows exactly one of two truly concurrent reservations on the same slot", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    const [resultatA, resultatB] = await Promise.all([
      creerReservation({ terrainId: terrain.id, userId: userA.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30" }),
      creerReservation({ terrainId: terrain.id, userId: userB.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30" }),
    ]);

    const succes = [resultatA, resultatB].filter((r) => r.ok);
    const echecs = [resultatA, resultatB].filter((r) => !r.ok);
    expect(succes).toHaveLength(1);
    expect(echecs).toHaveLength(1);

    const enBase = await prisma.reservation.count({
      where: { terrainId: terrain.id, date: "2026-09-07", heureDebut: "18:00", statut: "confirmee" },
    });
    expect(enBase).toBe(1);
  });

  it("allows re-booking a slot after cancellation", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    const premiere = await creerReservation({
      terrainId: terrain.id, userId: userA.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    if (!premiere.ok) throw new Error("setup failed");

    // "Maintenant" très en amont du créneau, donc annulable.
    const annulation = await annulerReservation(premiere.id, userA.id, new Date(2026, 8, 1));
    expect(annulation).toEqual({ ok: true });

    const resultat = await creerReservation({
      terrainId: terrain.id, userId: userB.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    expect(resultat.ok).toBe(true);
  });

  it("refuses to cancel less than 24h before the slot", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    const reservation = await creerReservation({
      terrainId: terrain.id, userId: user.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    if (!reservation.ok) throw new Error("setup failed");

    // "Maintenant" à 2h avant le début du créneau (2026-09-07 18:00).
    const proche = new Date(2026, 8, 7, 16, 0);
    const resultat = await annulerReservation(reservation.id, user.id, proche);

    expect(resultat).toEqual({ ok: false, raison: "trop_tard" });
  });

  it("allows cancelling exactly at the 24h boundary", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    const reservation = await creerReservation({
      terrainId: terrain.id, userId: user.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    if (!reservation.ok) throw new Error("setup failed");

    // Exactement 24h avant 2026-09-07 18:00.
    const limite = new Date(2026, 8, 6, 18, 0);
    const resultat = await annulerReservation(reservation.id, user.id, limite);

    expect(resultat).toEqual({ ok: true });
  });

  it("refuses to cancel someone else's reservation", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");
    const reservation = await creerReservation({
      terrainId: terrain.id, userId: userA.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    if (!reservation.ok) throw new Error("setup failed");

    const resultat = await annulerReservation(reservation.id, userB.id, new Date(2026, 8, 1));
    expect(resultat).toEqual({ ok: false, raison: "introuvable" });
  });

  it("refuses to cancel an unknown reservation", async () => {
    const user = await creerUtilisateur("a@example.com");
    const resultat = await annulerReservation("inconnu", user.id, new Date(2026, 8, 1));
    expect(resultat).toEqual({ ok: false, raison: "introuvable" });
  });

  it("lists a user's reservations ordered by date, marking cancellability", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    await creerReservation({
      terrainId: terrain.id, userId: user.id, date: "2026-09-10", heureDebut: "18:00", heureFin: "19:30",
    });
    await creerReservation({
      terrainId: terrain.id, userId: user.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });

    const liste = await findReservationsForUser(user.id, new Date(2026, 8, 1));
    expect(liste.map((r) => r.date)).toEqual(["2026-09-07", "2026-09-10"]);
    expect(liste.every((r) => r.annulable)).toBe(true);
    expect(liste[0].terrainNom).toBe("Terrain Test");
  });

  it("marks a cancelled reservation as not cancellable and keeps it in the list", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    const reservation = await creerReservation({
      terrainId: terrain.id, userId: user.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30",
    });
    if (!reservation.ok) throw new Error("setup failed");
    await annulerReservation(reservation.id, user.id, new Date(2026, 8, 1));

    const liste = await findReservationsForUser(user.id, new Date(2026, 8, 1));
    expect(liste).toHaveLength(1);
    expect(liste[0].statut).toBe("annulee");
    expect(liste[0].annulable).toBe(false);
  });
});
