import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST as creer } from "@/app/api/matchs/route";
import { POST as rejoindre } from "@/app/api/matchs/[id]/rejoindre/route";
import { POST as quitter } from "@/app/api/matchs/[id]/quitter/route";
import { POST as annuler } from "@/app/api/matchs/[id]/annuler/route";

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

async function creerUtilisateur(email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

function creerRequest(body: unknown) {
  return new Request("http://localhost/api/matchs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/matchs", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await creer(
      creerRequest({ terrainId: "t1", date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30", joueursMax: 10 })
    );
    expect(response.status).toBe(401);
  });

  it("creates a match for a real, active terrain", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await creer(
      creerRequest({
        terrainId: terrain.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
      })
    );

    expect(response.status).toBe(201);
    const count = await prisma.match.count({ where: { terrainId: terrain.id } });
    expect(count).toBe(1);
  });

  it("returns 404 for an unknown terrain", async () => {
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await creer(
      creerRequest({
        terrainId: "inconnu",
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
      })
    );
    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid payload", async () => {
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await creer(creerRequest({ terrainId: "t1" }));
    expect(response.status).toBe(400);
  });
});

describe("match actions", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejoindre: returns 409 when already full", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    // joueursMax: 2 est le minimum autorisé par creerMatchSchema — l'organisateur
    // compte pour 1, il faut donc un second joueur pour remplir le match avant
    // de tester le rejet du troisième.
    const createResponse = await creer(
      creerRequest({ terrainId: terrain.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30", joueursMax: 2 })
    );
    const { id } = await createResponse.json();

    const premier = await creerUtilisateur("premier@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: premier.id } } as never);
    await rejoindre(
      new Request(`http://localhost/api/matchs/${id}/rejoindre`, { method: "POST" }),
      { params: Promise.resolve({ id }) }
    );

    const autre = await creerUtilisateur("autre@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: autre.id } } as never);
    const response = await rejoindre(
      new Request(`http://localhost/api/matchs/${id}/rejoindre`, { method: "POST" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(409);
  });

  it("rejoindre then quitter: leaves the match", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    const createResponse = await creer(
      creerRequest({ terrainId: terrain.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30", joueursMax: 10 })
    );
    const { id } = await createResponse.json();

    const joueur = await creerUtilisateur("j@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: joueur.id } } as never);
    await rejoindre(new Request(`http://localhost/api/matchs/${id}/rejoindre`, { method: "POST" }), {
      params: Promise.resolve({ id }),
    });

    const response = await quitter(
      new Request(`http://localhost/api/matchs/${id}/quitter`, { method: "POST" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(200);

    const count = await prisma.matchParticipant.count({ where: { matchId: id, userId: joueur.id } });
    expect(count).toBe(0);
  });

  it("annuler: returns 403 for a non-organizer", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    const createResponse = await creer(
      creerRequest({ terrainId: terrain.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30", joueursMax: 10 })
    );
    const { id } = await createResponse.json();

    const autre = await creerUtilisateur("autre@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: autre.id } } as never);
    const response = await annuler(
      new Request(`http://localhost/api/matchs/${id}/annuler`, { method: "POST" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(403);
  });

  it("annuler: returns 200 for the organizer", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    const createResponse = await creer(
      creerRequest({ terrainId: terrain.id, date: "2026-09-07", heureDebut: "18:00", heureFin: "19:30", joueursMax: 10 })
    );
    const { id } = await createResponse.json();

    const response = await annuler(
      new Request(`http://localhost/api/matchs/${id}/annuler`, { method: "POST" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(200);
  });
});
