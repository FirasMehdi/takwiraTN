import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  statutRelation,
  envoyerDemande,
  accepterDemande,
  refuserDemande,
  findAmis,
  findDemandesRecues,
  sontAmis,
} from "@/lib/amis/queries";

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

describe("amis/queries", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(creerNotification).mockClear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("starts with no relation between two users", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    expect(await statutRelation(a.id, b.id)).toBe("aucune");
  });

  it("sends a friend request and reflects it from both sides", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");

    const resultat = await envoyerDemande(a.id, b.id);
    expect(resultat.ok).toBe(true);

    expect(await statutRelation(a.id, b.id)).toBe("demande_envoyee");
    expect(await statutRelation(b.id, a.id)).toBe("demande_recue");
  });

  it("rejects sending a request to oneself", async () => {
    const a = await creerUtilisateur("a@example.com");
    const resultat = await envoyerDemande(a.id, a.id);
    expect(resultat).toEqual({ ok: false, raison: "soi_meme" });
  });

  it("rejects a duplicate pending request", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    await envoyerDemande(a.id, b.id);

    const resultat = await envoyerDemande(a.id, b.id);
    expect(resultat).toEqual({ ok: false, raison: "demande_existante" });
  });

  it("rejects a request when already friends", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const { id } = await envoyerDemande(a.id, b.id) as { id: string };
    await accepterDemande(id, b.id);

    const resultat = await envoyerDemande(b.id, a.id);
    expect(resultat).toEqual({ ok: false, raison: "deja_amis" });
  });

  it("accepts a request and makes both users friends", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const { id } = await envoyerDemande(a.id, b.id) as { id: string };

    const resultat = await accepterDemande(id, b.id);
    expect(resultat).toEqual({ ok: true });
    expect(await sontAmis(a.id, b.id)).toBe(true);

    const amisDeA = await findAmis(a.id);
    expect(amisDeA.map((x) => x.id)).toEqual([b.id]);
  });

  it("refuses to let someone else accept a request not addressed to them", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const c = await creerUtilisateur("c@example.com");
    const { id } = await envoyerDemande(a.id, b.id) as { id: string };

    const resultat = await accepterDemande(id, c.id);
    expect(resultat).toEqual({ ok: false, raison: "introuvable" });
    expect(await sontAmis(a.id, b.id)).toBe(false);
  });

  it("declining a request allows a new request to be sent later", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const { id } = await envoyerDemande(a.id, b.id) as { id: string };
    await refuserDemande(id, b.id);

    expect(await statutRelation(a.id, b.id)).toBe("aucune");
    const resultat = await envoyerDemande(a.id, b.id);
    expect(resultat.ok).toBe(true);
  });

  it("lists pending received requests", async () => {
    const a = await creerUtilisateur("a@example.com", "Amine");
    const b = await creerUtilisateur("b@example.com");
    await envoyerDemande(a.id, b.id);

    const demandes = await findDemandesRecues(b.id);
    expect(demandes).toHaveLength(1);
    expect(demandes[0].prenom).toBe("Amine");
  });

  it("creates a notification for the recipient on a successful request", async () => {
    const demandeur = await creerUtilisateur("demandeur@test.com", "Amine");
    const destinataire = await creerUtilisateur("destinataire@test.com", "Sami");

    await envoyerDemande(demandeur.id, destinataire.id);

    const notifications = await prisma.notification.findMany({ where: { userId: destinataire.id } });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("demande_ami");
  });

  it("still creates the request and returns ok when notification creation fails (fresh request)", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    vi.mocked(creerNotification).mockRejectedValueOnce(new Error("boom"));

    const resultat = await envoyerDemande(a.id, b.id);
    expect(resultat).toEqual({ ok: true, id: expect.any(String) });
    expect(await statutRelation(a.id, b.id)).toBe("demande_envoyee");
  });

  it("still reactivates the request and returns ok when notification creation fails (after refusal)", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const { id } = (await envoyerDemande(a.id, b.id)) as { id: string };
    await refuserDemande(id, b.id);

    vi.mocked(creerNotification).mockRejectedValueOnce(new Error("boom"));
    const resultat = await envoyerDemande(a.id, b.id);
    expect(resultat).toEqual({ ok: true, id });
    expect(await statutRelation(a.id, b.id)).toBe("demande_envoyee");
  });
});
