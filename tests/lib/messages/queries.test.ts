import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import { envoyerDemande, accepterDemande } from "@/lib/amis/queries";
import { envoyerMessage, findConversation, findConversations } from "@/lib/messages/queries";

vi.mock("@/lib/notifications/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notifications/queries")>();
  return { ...actual, creerNotification: vi.fn(actual.creerNotification) };
});
import { creerNotification } from "@/lib/notifications/queries";

async function creerUtilisateur(email: string, prenom = "Joueur") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom, ville: "Tunis" } },
    },
  });
}

async function creerAmis(prenomA: string, prenomB: string) {
  const a = await creerUtilisateur(`${prenomA.toLowerCase()}@example.com`, prenomA);
  const b = await creerUtilisateur(`${prenomB.toLowerCase()}@example.com`, prenomB);
  const { id } = (await envoyerDemande(a.id, b.id)) as { id: string };
  await accepterDemande(id, b.id);
  return { a, b };
}

describe("messages/queries", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(creerNotification).mockClear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("refuses to send a message between non-friends", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");

    const resultat = await envoyerMessage(a.id, b.id, "Salut !");
    expect(resultat).toEqual({ ok: false, raison: "pas_amis" });
  });

  it("sends a message between friends and it appears in the conversation", async () => {
    const { a, b } = await creerAmis("Amine", "Bilel");

    const resultat = await envoyerMessage(a.id, b.id, "On joue quand ?");
    expect(resultat.ok).toBe(true);

    const conversation = await findConversation(a.id, b.id);
    expect(conversation).toHaveLength(1);
    expect(conversation[0].contenu).toBe("On joue quand ?");
    expect(conversation[0].expediteurId).toBe(a.id);
  });

  it("returns messages from both directions in chronological order", async () => {
    const { a, b } = await creerAmis("Amine", "Bilel");
    await envoyerMessage(a.id, b.id, "Premier");
    await envoyerMessage(b.id, a.id, "Deuxième");

    const conversation = await findConversation(a.id, b.id);
    expect(conversation.map((m) => m.contenu)).toEqual(["Premier", "Deuxième"]);
  });

  it("lists conversations with the last message per contact", async () => {
    const { a, b } = await creerAmis("Amine", "Bilel");
    await envoyerMessage(a.id, b.id, "Ancien message");
    await envoyerMessage(b.id, a.id, "Message récent");

    const conversations = await findConversations(a.id);
    expect(conversations).toHaveLength(1);
    expect(conversations[0].autreUserId).toBe(b.id);
    expect(conversations[0].dernierMessage).toBe("Message récent");
  });

  it("returns no conversation when looking up a conversation with oneself", async () => {
    const a = await creerUtilisateur("a@example.com");

    const resultat = await findConversation(a.id, a.id);
    expect(resultat).toEqual([]);
  });

  it("still returns no conversation for oneself even when a real conversation with someone else exists", async () => {
    // Régression : avant le correctif, le clause AND de findConversation
    // dégénérait en deux prédicats "some" identiques quand userIdA ===
    // userIdB, et retournait alors n'importe quelle conversation à laquelle
    // A participe (ici, celle avec B) au lieu de [] — cette variante du test
    // échoue avec l'ancien code, contrairement à celle ci-dessus qui passait
    // déjà sans le correctif faute d'une vraie conversation à faire fuiter.
    const { a, b } = await creerAmis("Amine", "Bilel");
    await envoyerMessage(a.id, b.id, "On joue quand ?");

    const resultat = await findConversation(a.id, a.id);
    expect(resultat).toEqual([]);
  });

  it("still sends the message and returns ok when notification creation fails", async () => {
    const { a, b } = await creerAmis("Amine", "Bilel");
    vi.mocked(creerNotification).mockRejectedValueOnce(new Error("boom"));

    const resultat = await envoyerMessage(a.id, b.id, "On joue quand ?");
    expect(resultat).toEqual({ ok: true, id: expect.any(String) });

    const conversation = await findConversation(a.id, b.id);
    expect(conversation).toHaveLength(1);
  });
});
