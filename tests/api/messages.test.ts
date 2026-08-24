import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { envoyerDemande, accepterDemande } from "@/lib/amis/queries";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { GET as lireConversation, POST as envoyer } from "@/app/api/messages/[userId]/route";

async function creerUtilisateur(email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

async function creerAmis() {
  const a = await creerUtilisateur("a@example.com");
  const b = await creerUtilisateur("b@example.com");
  const { id } = (await envoyerDemande(a.id, b.id)) as { id: string };
  await accepterDemande(id, b.id);
  return { a, b };
}

function creerMessageRequest(body: unknown) {
  return new Request("http://localhost/api/messages/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/messages/[userId]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await lireConversation(
      new Request("http://localhost/api/messages/x"),
      { params: Promise.resolve({ userId: "x" }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 when sending to a non-friend", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);

    const response = await envoyer(creerMessageRequest({ contenu: "Salut" }), {
      params: Promise.resolve({ userId: b.id }),
    });
    expect(response.status).toBe(403);
  });

  it("sends a message between friends and it appears in the GET history", async () => {
    const { a, b } = await creerAmis();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);

    const postResponse = await envoyer(creerMessageRequest({ contenu: "On joue quand ?" }), {
      params: Promise.resolve({ userId: b.id }),
    });
    expect(postResponse.status).toBe(201);

    const getResponse = await lireConversation(new Request("http://localhost/api/messages/x"), {
      params: Promise.resolve({ userId: b.id }),
    });
    const body = await getResponse.json();
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].contenu).toBe("On joue quand ?");
  });

  it("returns 400 for an empty message", async () => {
    const { a, b } = await creerAmis();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);

    const response = await envoyer(creerMessageRequest({ contenu: "  " }), {
      params: Promise.resolve({ userId: b.id }),
    });
    expect(response.status).toBe(400);
  });
});
