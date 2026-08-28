import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { GET, DELETE } from "@/app/api/admin/proprietaires/[id]/route";

async function creerUtilisateur(role: "joueur" | "proprietaire" | "administrateur", email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
      ...(role === "joueur" ? { profile: { create: { prenom: "Test", ville: "Tunis" } } } : {}),
    },
  });
}

function sessionPour(userId: string, role: string) {
  return { user: { id: userId, role } } as never;
}

describe("/api/admin/proprietaires/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/admin/proprietaires/x"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(401);
  });

  it("GET returns 403 for a non-administrateur session", async () => {
    const joueur = await creerUtilisateur("joueur", "j@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(joueur.id, "joueur"));
    const response = await GET(new Request("http://localhost/api/admin/proprietaires/x"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(403);
  });

  it("GET returns the proprietaire with its terrains", async () => {
    const admin = await creerUtilisateur("administrateur", "admin@example.com");
    const owner = await creerUtilisateur("proprietaire", "owner@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await GET(new Request("http://localhost/api/admin/proprietaires/x"), {
      params: Promise.resolve({ id: owner.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.email).toBe("owner@example.com");
    expect(body.terrains).toEqual([]);
  });

  it("GET returns 404 for an unknown proprietaire", async () => {
    const admin = await creerUtilisateur("administrateur", "admin2@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await GET(new Request("http://localhost/api/admin/proprietaires/x"), {
      params: Promise.resolve({ id: "inconnu" }),
    });
    expect(response.status).toBe(404);
  });

  it("DELETE removes the proprietaire", async () => {
    const admin = await creerUtilisateur("administrateur", "admin3@example.com");
    const owner = await creerUtilisateur("proprietaire", "owner2@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await DELETE(
      new Request("http://localhost/api/admin/proprietaires/x", { method: "DELETE" }),
      { params: Promise.resolve({ id: owner.id }) }
    );
    expect(response.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: owner.id } })).toBeNull();
  });

  it("DELETE returns 403 for a non-administrateur session", async () => {
    const joueur = await creerUtilisateur("joueur", "j2@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(joueur.id, "joueur"));

    const response = await DELETE(
      new Request("http://localhost/api/admin/proprietaires/x", { method: "DELETE" }),
      { params: Promise.resolve({ id: "x" }) }
    );
    expect(response.status).toBe(403);
  });
});
