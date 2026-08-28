import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { creerTerrain } from "@/lib/terrains/gestion";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { PATCH, DELETE } from "@/app/api/proprietaire/terrains/[id]/route";

async function creerUtilisateur(email: string, role: "joueur" | "proprietaire" = "proprietaire") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

function creerRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/proprietaire/terrains/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const inputBase = {
  nom: "Terrain Test",
  adresse: "Rue Test",
  ville: "Tunis",
  type: "gazon_synthetique" as const,
  formats: [{ format: "cinq" as const, capacite: 10, prixParCreneau: 60000 }],
  horaires: [{ jourSemaine: 1, ouvre: "08:00", ferme: "22:00" }],
};

describe("PATCH /api/proprietaire/terrains/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await PATCH(creerRequest("PATCH", inputBase), { params: Promise.resolve({ id: "x" }) });
    expect(response.status).toBe(401);
  });

  it("updates the terrain for its owner", async () => {
    const owner = await creerUtilisateur("owner@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PATCH(
      creerRequest("PATCH", { ...inputBase, nom: "Nom modifié" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(200);
    const terrain = await prisma.terrain.findUnique({ where: { id } });
    expect(terrain?.nom).toBe("Nom modifié");
  });

  it("returns 403 when the terrain belongs to someone else", async () => {
    const owner = await creerUtilisateur("owner2@example.com");
    const other = await creerUtilisateur("other@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: other.id, role: "proprietaire" } } as never);

    const response = await PATCH(creerRequest("PATCH", inputBase), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(403);
  });

  it("returns 404 for a non-existent terrain", async () => {
    const owner = await creerUtilisateur("owner3@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PATCH(creerRequest("PATCH", inputBase), { params: Promise.resolve({ id: "inexistant" }) });
    expect(response.status).toBe(404);
  });

  it("returns 400 for an invalid payload", async () => {
    const owner = await creerUtilisateur("owner4@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PATCH(creerRequest("PATCH", { ...inputBase, nom: "" }), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/proprietaire/terrains/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deletes the terrain for its owner", async () => {
    const owner = await creerUtilisateur("owner5@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await DELETE(creerRequest("DELETE"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(200);
    expect(await prisma.terrain.findUnique({ where: { id } })).toBeNull();
  });

  it("returns 409 when the terrain has an active future reservation", async () => {
    const owner = await creerUtilisateur("owner6@example.com");
    const player = await creerUtilisateur("player@example.com", "joueur");
    const { id } = await creerTerrain(owner.id, inputBase);
    await prisma.reservation.create({
      data: { terrainId: id, userId: player.id, date: "2099-01-01", heureDebut: "10:00", heureFin: "11:30" },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await DELETE(creerRequest("DELETE"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(409);
    expect(await prisma.terrain.findUnique({ where: { id } })).not.toBeNull();
  });

  it("returns 403 when the terrain belongs to someone else", async () => {
    const owner = await creerUtilisateur("owner7@example.com");
    const other = await creerUtilisateur("other2@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: other.id, role: "proprietaire" } } as never);

    const response = await DELETE(creerRequest("DELETE"), { params: Promise.resolve({ id }) });
    expect(response.status).toBe(403);
  });
});
