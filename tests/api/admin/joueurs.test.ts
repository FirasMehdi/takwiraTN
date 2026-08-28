import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { GET, PUT, DELETE } from "@/app/api/admin/joueurs/[id]/route";

async function creerUtilisateur(role: "joueur" | "proprietaire" | "administrateur", email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      role,
      ...(role === "joueur" ? { profile: { create: { prenom: "Amine", ville: "Tunis" } } } : {}),
    },
  });
}

function sessionPour(userId: string, role: string) {
  return { user: { id: userId, role } } as never;
}

function putRequest(body: unknown) {
  return new Request("http://localhost/api/admin/joueurs/x", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/admin/joueurs/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("GET returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/admin/joueurs/x"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(401);
  });

  it("GET returns 403 for a non-administrateur session", async () => {
    const joueur = await creerUtilisateur("joueur", "j@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(joueur.id, "joueur"));
    const response = await GET(new Request("http://localhost/api/admin/joueurs/x"), {
      params: Promise.resolve({ id: joueur.id }),
    });
    expect(response.status).toBe(403);
  });

  it("GET returns the joueur for an administrateur session", async () => {
    const admin = await creerUtilisateur("administrateur", "admin@example.com");
    const joueur = await creerUtilisateur("joueur", "j2@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await GET(new Request("http://localhost/api/admin/joueurs/x"), {
      params: Promise.resolve({ id: joueur.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.email).toBe("j2@example.com");
  });

  it("GET returns 404 for an unknown joueur", async () => {
    const admin = await creerUtilisateur("administrateur", "admin2@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await GET(new Request("http://localhost/api/admin/joueurs/x"), {
      params: Promise.resolve({ id: "inconnu" }),
    });
    expect(response.status).toBe(404);
  });

  it("PUT updates the joueur profile", async () => {
    const admin = await creerUtilisateur("administrateur", "admin3@example.com");
    const joueur = await creerUtilisateur("joueur", "j3@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await PUT(putRequest({ prenom: "Amine K.", ville: "Sfax" }), {
      params: Promise.resolve({ id: joueur.id }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.prenom).toBe("Amine K.");
  });

  it("PUT returns 400 for an invalid payload", async () => {
    const admin = await creerUtilisateur("administrateur", "admin4@example.com");
    const joueur = await creerUtilisateur("joueur", "j4@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await PUT(putRequest({ prenom: "", ville: "Sfax" }), {
      params: Promise.resolve({ id: joueur.id }),
    });
    expect(response.status).toBe(400);
  });

  it("PUT returns 403 for a non-administrateur session", async () => {
    const joueur = await creerUtilisateur("joueur", "j5@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(joueur.id, "joueur"));

    const response = await PUT(putRequest({ prenom: "X", ville: "Y" }), {
      params: Promise.resolve({ id: joueur.id }),
    });
    expect(response.status).toBe(403);
  });

  it("DELETE removes the joueur", async () => {
    const admin = await creerUtilisateur("administrateur", "admin5@example.com");
    const joueur = await creerUtilisateur("joueur", "j6@example.com");
    vi.mocked(getServerSession).mockResolvedValue(sessionPour(admin.id, "administrateur"));

    const response = await DELETE(new Request("http://localhost/api/admin/joueurs/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: joueur.id }),
    });
    expect(response.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: joueur.id } })).toBeNull();
  });

  it("DELETE returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await DELETE(new Request("http://localhost/api/admin/joueurs/x", { method: "DELETE" }), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(response.status).toBe(401);
  });
});
