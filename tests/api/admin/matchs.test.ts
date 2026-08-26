import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST } from "@/app/api/admin/matchs/[id]/annuler/route";

async function creerAdmin(email: string) {
  return prisma.user.create({
    data: { email, passwordHash: await hashPassword("motdepasse123"), role: "administrateur" },
  });
}

async function creerJoueur(email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

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

async function creerMatch(terrainId: string, organisateurId: string) {
  return prisma.match.create({
    data: {
      terrainId,
      organisateurId,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      joueursMax: 10,
    },
  });
}

function sessionPour(userId: string, role: string) {
  return { user: { id: userId, role } } as never;
}

function annulerRequest(body: unknown) {
  return new Request("http://localhost/api/admin/matchs/x/annuler", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/matchs/[id]/annuler", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await POST(annulerRequest({ raison: "personnel" }), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 403 for a non-administrateur session", async () => {
    const joueur = await creerJoueur("j@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(joueur.id, "joueur"));
    const response = await POST(annulerRequest({ raison: "personnel" }), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(403);
  });

  it("cancels the match and records the admin's own id on the Annulation", async () => {
    const admin = await creerAdmin("admin@example.com");
    const org = await creerJoueur("org@example.com");
    const terrain = await creerTerrain();
    const match = await creerMatch(terrain.id, org.id);
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await POST(annulerRequest({ raison: "terrain_indisponible" }), {
      params: Promise.resolve({ id: match.id }),
    });
    expect(response.status).toBe(200);

    const annulation = await prisma.annulation.findUniqueOrThrow({ where: { matchId: match.id } });
    expect(annulation.userId).toBe(admin.id);
  });

  it("returns 400 when raison is autre without raisonAutre", async () => {
    const admin = await creerAdmin("admin2@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await POST(annulerRequest({ raison: "autre" }), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 404 for an unknown match", async () => {
    const admin = await creerAdmin("admin3@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await POST(annulerRequest({ raison: "personnel" }), {
      params: Promise.resolve({ id: "inconnu" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 409 for an already-cancelled match", async () => {
    const admin = await creerAdmin("admin4@example.com");
    const org = await creerJoueur("org2@example.com");
    const terrain = await creerTerrain();
    const match = await creerMatch(terrain.id, org.id);
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    await POST(annulerRequest({ raison: "personnel" }), { params: Promise.resolve({ id: match.id }) });
    const second = await POST(annulerRequest({ raison: "personnel" }), {
      params: Promise.resolve({ id: match.id }),
    });
    expect(second.status).toBe(409);
  });
});
