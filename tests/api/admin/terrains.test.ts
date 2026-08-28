import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { PATCH, DELETE } from "@/app/api/admin/terrains/[id]/route";

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

function sessionPour(userId: string, role: string) {
  return { user: { id: userId, role } } as never;
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/admin/terrains/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/terrains/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("PATCH returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await PATCH(patchRequest({ statut: "suspendu" }), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(401);
  });

  it("PATCH returns 403 for a non-administrateur session", async () => {
    const joueur = await creerJoueur("j@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(joueur.id, "joueur"));
    const response = await PATCH(patchRequest({ statut: "suspendu" }), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(403);
  });

  it("PATCH updates the statut for an administrateur", async () => {
    const admin = await creerAdmin("admin@example.com");
    const terrain = await creerTerrain();
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await PATCH(patchRequest({ statut: "suspendu" }), {
      params: Promise.resolve({ id: terrain.id }),
    });
    expect(response.status).toBe(200);

    const misAJour = await prisma.terrain.findUniqueOrThrow({ where: { id: terrain.id } });
    expect(misAJour.statut).toBe("suspendu");
  });

  it("PATCH returns 400 for an invalid statut", async () => {
    const admin = await creerAdmin("admin2@example.com");
    const terrain = await creerTerrain();
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await PATCH(patchRequest({ statut: "archive" }), {
      params: Promise.resolve({ id: terrain.id }),
    });
    expect(response.status).toBe(400);
  });

  it("PATCH returns 404 for an unknown terrain", async () => {
    const admin = await creerAdmin("admin3@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await PATCH(patchRequest({ statut: "actif" }), {
      params: Promise.resolve({ id: "inconnu" }),
    });
    expect(response.status).toBe(404);
  });

  it("DELETE removes the terrain for an administrateur", async () => {
    const admin = await creerAdmin("admin4@example.com");
    const terrain = await creerTerrain();
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await DELETE(new Request("http://localhost/api/admin/terrains/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: terrain.id }),
    });
    expect(response.status).toBe(200);
    expect(await prisma.terrain.findUnique({ where: { id: terrain.id } })).toBeNull();
  });

  it("DELETE returns 403 for a non-administrateur session", async () => {
    const joueur = await creerJoueur("j2@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(joueur.id, "joueur"));

    const response = await DELETE(new Request("http://localhost/api/admin/terrains/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(403);
  });
});
