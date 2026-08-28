import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { creerTerrain } from "@/lib/terrains/gestion";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST } from "@/app/api/proprietaire/terrains/[id]/formats/route";
import { PATCH, DELETE } from "@/app/api/proprietaire/terrains/[id]/formats/[formatId]/route";

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

function creerRequest(url: string, method: string, body?: unknown) {
  return new Request(url, {
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

describe("POST /api/proprietaire/terrains/[id]/formats", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("adds a new format for the owner", async () => {
    const owner = await creerUtilisateur("owner@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await POST(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/formats`, "POST", {
        format: "sept",
        capacite: 14,
        prixParCreneau: 80000,
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(201);
    const count = await prisma.terrainFormatOffre.count({ where: { terrainId: id } });
    expect(count).toBe(2);
  });

  it("returns 409 for a duplicate format", async () => {
    const owner = await creerUtilisateur("owner2@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await POST(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/formats`, "POST", {
        format: "cinq",
        capacite: 10,
        prixParCreneau: 60000,
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(409);
  });

  it("returns 403 for someone else's terrain", async () => {
    const owner = await creerUtilisateur("owner3@example.com");
    const other = await creerUtilisateur("other@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: other.id, role: "proprietaire" } } as never);

    const response = await POST(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/formats`, "POST", {
        format: "sept",
        capacite: 14,
        prixParCreneau: 80000,
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(403);
  });
});

describe("PATCH/DELETE /api/proprietaire/terrains/[id]/formats/[formatId]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates a format's capacite/prix for the owner", async () => {
    const owner = await creerUtilisateur("owner4@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id } });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await PATCH(
      creerRequest(
        `http://localhost/api/proprietaire/terrains/${id}/formats/${format.id}`,
        "PATCH",
        { capacite: 12, prixParCreneau: 65000 }
      ),
      { params: Promise.resolve({ id, formatId: format.id }) }
    );
    expect(response.status).toBe(200);
    const updated = await prisma.terrainFormatOffre.findUnique({ where: { id: format.id } });
    expect(updated?.capacite).toBe(12);
  });

  it("deletes a format when more than one remains", async () => {
    const owner = await creerUtilisateur("owner5@example.com");
    const { id } = await creerTerrain(owner.id, {
      ...inputBase,
      formats: [
        { format: "cinq", capacite: 10, prixParCreneau: 60000 },
        { format: "sept", capacite: 14, prixParCreneau: 80000 },
      ],
    });
    const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id, format: "cinq" } });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await DELETE(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/formats/${format.id}`, "DELETE"),
      { params: Promise.resolve({ id, formatId: format.id }) }
    );
    expect(response.status).toBe(200);
  });

  it("returns 409 when deleting the last remaining format", async () => {
    const owner = await creerUtilisateur("owner6@example.com");
    const { id } = await creerTerrain(owner.id, inputBase);
    const format = await prisma.terrainFormatOffre.findFirstOrThrow({ where: { terrainId: id } });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await DELETE(
      creerRequest(`http://localhost/api/proprietaire/terrains/${id}/formats/${format.id}`, "DELETE"),
      { params: Promise.resolve({ id, formatId: format.id }) }
    );
    expect(response.status).toBe(409);
  });
});
