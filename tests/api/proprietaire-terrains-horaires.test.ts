import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { creerTerrain } from "@/lib/terrains/gestion";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { PUT } from "@/app/api/proprietaire/terrains/[id]/horaires/route";

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

function creerRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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

describe("PUT /api/proprietaire/terrains/[id]/horaires", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("replaces the terrain's horaires for its owner", async () => {
    const owner = await creerUtilisateur("owner@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PUT(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/horaires`, {
        horaires: [
          { jourSemaine: 0, ouvre: "09:00", ferme: "12:00" },
          { jourSemaine: 0, ouvre: "16:00", ferme: "20:00" },
        ],
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(200);
    const horaires = await prisma.terrainHoraire.findMany({ where: { terrainId: id } });
    expect(horaires).toHaveLength(2);
  });

  it("rejects an empty horaires array", async () => {
    const owner = await creerUtilisateur("owner2@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PUT(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/horaires`, { horaires: [] }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(400);
  });

  it("returns 403 for someone else's terrain", async () => {
    const owner = await creerUtilisateur("owner3@example.com");
    const other = await creerUtilisateur("other@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: other.id, role: "proprietaire" } } as never);

    const response = await PUT(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/horaires`, {
        horaires: [{ jourSemaine: 0, ouvre: "09:00", ferme: "12:00" }],
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(403);
  });

  it("returns 404 for a non-existent terrain", async () => {
    const owner = await creerUtilisateur("owner4@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PUT(
      creerRequest(`http://localhost/api/proprietaire/terrains/inexistant/horaires`, {
        horaires: [{ jourSemaine: 0, ouvre: "09:00", ferme: "12:00" }],
      }),
      { params: Promise.resolve({ id: "inexistant" }) }
    );
    expect(response.status).toBe(404);
  });
});
