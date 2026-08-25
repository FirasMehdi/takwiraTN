import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST as reserver } from "@/app/api/terrains/[id]/reservations/route";
import { POST as annuler } from "@/app/api/reservations/[id]/annuler/route";

async function creerTerrain() {
  return prisma.terrain.create({
    data: {
      nom: "Terrain Test",
      adresse: "Adresse",
      ville: "Tunis",
      type: "gazon_synthetique",
      formats: { create: [{ format: "cinq", capacite: 10, prixParCreneau: 50000 }] },
      // dureeCreneauMinutes explicite (60) : avec le défaut du schéma (90),
      // 08:00-20:00 ne génère aucun créneau démarrant exactement à 18:00
      // (08:00, 09:30, ..., 17:00, 18:30 — 18:00 n'en fait pas partie).
      // Les tests ci-dessous réservent "18:00" ; il doit correspondre à un
      // vrai créneau généré par generateSlots pour être accepté par la route.
      dureeCreneauMinutes: 60,
      horaires: { create: [{ jourSemaine: 1, ouvre: "08:00", ferme: "20:00" }] },
    },
  });
}

async function creerUtilisateur(email: string) {
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword("motdepasse123") },
  });
}

function makeReservationRequest(body: unknown) {
  return new Request("http://localhost/api/terrains/x/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/terrains/[id]/reservations", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const terrain = await creerTerrain();

    const response = await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:00" }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    expect(response.status).toBe(401);
  });

  it("creates a reservation for a real, available slot", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:00" }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    expect(response.status).toBe(201);
    const count = await prisma.reservation.count({ where: { terrainId: terrain.id } });
    expect(count).toBe(1);
  });

  it("rejects a time that doesn't correspond to a real generated slot", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    // "18:07" respecte le format HH:MM (heureSchema le laisse passer), donc
    // ce n'est pas une erreur 400 de validation — c'est la route qui, en ne
    // le retrouvant pas parmi les créneaux réellement générés pour ce
    // terrain, le traite comme non disponible (même branche que "créneau
    // déjà pris", 409 — voir Task 2 Step 6).
    const response = await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:07" }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    expect(response.status).toBe(409);
  });

  it("returns 409 when the slot is already taken", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userA.id } } as never);
    await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:00" }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userB.id } } as never);
    const response = await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:00" }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    expect(response.status).toBe(409);
  });

  it("returns 404 for an unknown terrain", async () => {
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await reserver(
      makeReservationRequest({ date: "2026-09-07", heureDebut: "18:00" }),
      { params: Promise.resolve({ id: "inconnu" }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 on malformed JSON", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await reserver(
      new Request("http://localhost/api/terrains/x/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ not valid json",
      }),
      { params: Promise.resolve({ id: terrain.id }) }
    );

    expect(response.status).toBe(400);
  });
});

describe("POST /api/reservations/[id]/annuler", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await annuler(
      new Request("http://localhost/api/reservations/x/annuler", { method: "POST" }),
      { params: Promise.resolve({ id: "x" }) }
    );
    expect(response.status).toBe(401);
  });

  it("cancels a reservation more than 24h out", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    const reservation = await prisma.reservation.create({
      data: {
        terrainId: terrain.id,
        userId: user.id,
        date: "2099-01-01",
        heureDebut: "18:00",
        heureFin: "19:30",
      },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await annuler(
      new Request(`http://localhost/api/reservations/${reservation.id}/annuler`, { method: "POST" }),
      { params: Promise.resolve({ id: reservation.id }) }
    );

    expect(response.status).toBe(200);
    const updated = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
    expect(updated.statut).toBe("annulee");
  });

  it("returns 404 for someone else's reservation", async () => {
    const terrain = await creerTerrain();
    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");
    const reservation = await prisma.reservation.create({
      data: { terrainId: terrain.id, userId: userA.id, date: "2099-01-01", heureDebut: "18:00", heureFin: "19:30" },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: userB.id } } as never);

    const response = await annuler(
      new Request(`http://localhost/api/reservations/${reservation.id}/annuler`, { method: "POST" }),
      { params: Promise.resolve({ id: reservation.id }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns 409 when cancelling less than 24h before the slot", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    const proche = new Date(Date.now() + 60 * 60 * 1000); // dans 1h
    const annee = proche.getFullYear();
    const mois = String(proche.getMonth() + 1).padStart(2, "0");
    const jour = String(proche.getDate()).padStart(2, "0");
    const heure = String(proche.getHours()).padStart(2, "0");
    const minute = String(proche.getMinutes()).padStart(2, "0");

    const reservation = await prisma.reservation.create({
      data: {
        terrainId: terrain.id,
        userId: user.id,
        date: `${annee}-${mois}-${jour}`,
        heureDebut: `${heure}:${minute}`,
        heureFin: `${heure}:${minute}`,
      },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await annuler(
      new Request(`http://localhost/api/reservations/${reservation.id}/annuler`, { method: "POST" }),
      { params: Promise.resolve({ id: reservation.id }) }
    );

    expect(response.status).toBe(409);
  });
});
