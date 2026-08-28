import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST } from "@/app/api/proprietaire/terrains/route";

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

function creerRequest(body: unknown) {
  return new Request("http://localhost/api/proprietaire/terrains", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const payloadValide = {
  nom: "Terrain Test",
  adresse: "Rue Test",
  ville: "Tunis",
  type: "gazon_synthetique",
  formats: [{ format: "cinq", capacite: 10, prixParCreneau: 60000 }],
  horaires: [{ jourSemaine: 1, ouvre: "08:00", ferme: "22:00" }],
};

describe("POST /api/proprietaire/terrains", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await POST(creerRequest(payloadValide));
    expect(response.status).toBe(401);
  });

  it("returns 403 for a joueur session", async () => {
    const user = await creerUtilisateur("joueur@example.com", "joueur");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id, role: "joueur" } } as never);

    const response = await POST(creerRequest(payloadValide));
    expect(response.status).toBe(403);
  });

  it("creates a terrain owned by the calling proprietaire", async () => {
    const owner = await creerUtilisateur("owner@example.com", "proprietaire");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await POST(creerRequest(payloadValide));
    expect(response.status).toBe(201);
    const body = await response.json();
    const terrain = await prisma.terrain.findUnique({ where: { id: body.id } });
    expect(terrain?.ownerId).toBe(owner.id);
    expect(terrain?.statut).toBe("en_attente");
  });

  it("rejects a payload with no formats", async () => {
    const owner = await creerUtilisateur("owner2@example.com", "proprietaire");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await POST(creerRequest({ ...payloadValide, formats: [] }));
    expect(response.status).toBe(400);
  });

  it("returns 400 instead of throwing on malformed JSON", async () => {
    const owner = await creerUtilisateur("owner3@example.com", "proprietaire");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: owner.id, role: "proprietaire" } } as never);

    const response = await POST(
      new Request("http://localhost/api/proprietaire/terrains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ not valid json",
      })
    );
    expect(response.status).toBe(400);
  });
});
