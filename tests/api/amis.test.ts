import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST as envoyer } from "@/app/api/amis/route";
import { POST as accepter } from "@/app/api/amis/[id]/accepter/route";
import { POST as refuser } from "@/app/api/amis/[id]/refuser/route";

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
  return new Request("http://localhost/api/amis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/amis", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await envoyer(creerRequest({ destinataireId: "u1" }));
    expect(response.status).toBe(401);
  });

  it("creates a friend request", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);

    const response = await envoyer(creerRequest({ destinataireId: b.id }));
    expect(response.status).toBe(201);
  });

  it("returns 409 for a duplicate request", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);
    await envoyer(creerRequest({ destinataireId: b.id }));

    const response = await envoyer(creerRequest({ destinataireId: b.id }));
    expect(response.status).toBe(409);
  });
});

describe("accepter/refuser a friend request", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("accepts a request addressed to the current user", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);
    const createResponse = await envoyer(creerRequest({ destinataireId: b.id }));
    const { id } = await createResponse.json();

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: b.id } } as never);
    const response = await accepter(
      new Request(`http://localhost/api/amis/${id}/accepter`, { method: "POST" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(200);
  });

  it("returns 404 when refusing someone else's request", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const c = await creerUtilisateur("c@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);
    const createResponse = await envoyer(creerRequest({ destinataireId: b.id }));
    const { id } = await createResponse.json();

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: c.id } } as never);
    const response = await refuser(
      new Request(`http://localhost/api/amis/${id}/refuser`, { method: "POST" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(404);
  });
});
