import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST as creer } from "@/app/api/matchs/route";
import { POST as rejoindre } from "@/app/api/matchs/[id]/rejoindre/route";
import { POST as quitter } from "@/app/api/matchs/[id]/quitter/route";
import { POST as annuler } from "@/app/api/matchs/[id]/annuler/route";
import { POST as decider } from "@/app/api/matchs/[id]/reservation/route";

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
  return new Request("http://localhost/api/matchs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function requeteAction(chemin: string, body?: unknown) {
  return new Request(`http://localhost${chemin}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

/** Payload de création valide, format inclus, organisateur joueur par défaut. */
function payloadCreation(terrainId: string, extra: Record<string, unknown> = {}) {
  return {
    terrainId,
    date: "2026-09-07",
    heureDebut: "18:00",
    heureFin: "19:30",
    format: "cinq",
    joueursMax: 10,
    organisateurParticipe: true,
    ...extra,
  };
}

describe("POST /api/matchs", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await creer(creerRequest(payloadCreation("t1")));
    expect(response.status).toBe(401);
  });

  it("creates a match for a real, active terrain", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await creer(creerRequest(payloadCreation(terrain.id)));

    expect(response.status).toBe(201);
    const match = await prisma.match.findFirst({ where: { terrainId: terrain.id } });
    expect(match?.format).toBe("cinq");
    expect(match?.organisateurParticipe).toBe(true);
    expect(match?.conversationId).toBeTruthy();
    expect(await prisma.matchParticipant.count({ where: { matchId: match!.id } })).toBe(1);
  });

  it("creates a match where the organizer only organizes", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await creer(
      creerRequest(payloadCreation(terrain.id, { organisateurParticipe: false }))
    );

    expect(response.status).toBe(201);
    const match = await prisma.match.findFirst({ where: { terrainId: terrain.id } });
    expect(match?.organisateurParticipe).toBe(false);
    expect(await prisma.matchParticipant.count({ where: { matchId: match!.id } })).toBe(0);
    // L'organisateur est bien dans la discussion, même sans jouer.
    expect(
      await prisma.conversationParticipant.count({
        where: { conversationId: match!.conversationId!, userId: user.id },
      })
    ).toBe(1);
  });

  it("returns 404 for an unknown terrain", async () => {
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await creer(creerRequest(payloadCreation("inconnu")));
    expect(response.status).toBe(404);
  });

  it("returns 400 when the terrain does not offer the requested format", async () => {
    const terrain = await creerTerrain();
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await creer(creerRequest(payloadCreation(terrain.id, { format: "onze" })));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.format[0]).toBe("Ce terrain ne propose pas ce format");
    expect(await prisma.match.count()).toBe(0);
  });

  it("returns 400 for an invalid payload", async () => {
    const user = await creerUtilisateur("a@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await creer(creerRequest({ terrainId: "t1" }));
    expect(response.status).toBe(400);
  });
});

describe("match actions", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejoindre: returns 409 when already full", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    // joueursMax: 2 est le minimum autorisé par creerMatchSchema — l'organisateur
    // compte pour 1, il faut donc un second joueur pour remplir le match avant
    // de tester le rejet du troisième.
    const createResponse = await creer(
      creerRequest(payloadCreation(terrain.id, { joueursMax: 2 }))
    );
    const { id } = await createResponse.json();

    const premier = await creerUtilisateur("premier@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: premier.id } } as never);
    await rejoindre(requeteAction(`/api/matchs/${id}/rejoindre`), {
      params: Promise.resolve({ id }),
    });

    const autre = await creerUtilisateur("autre@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: autre.id } } as never);
    const response = await rejoindre(requeteAction(`/api/matchs/${id}/rejoindre`), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(409);
  });

  it("rejoindre then quitter: leaves the match and its conversation", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    const createResponse = await creer(creerRequest(payloadCreation(terrain.id)));
    const { id } = await createResponse.json();

    const joueur = await creerUtilisateur("j@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: joueur.id } } as never);
    await rejoindre(requeteAction(`/api/matchs/${id}/rejoindre`), {
      params: Promise.resolve({ id }),
    });

    const match = await prisma.match.findUnique({ where: { id } });
    expect(
      await prisma.conversationParticipant.count({
        where: { conversationId: match!.conversationId!, userId: joueur.id },
      })
    ).toBe(1);

    const response = await quitter(requeteAction(`/api/matchs/${id}/quitter`), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(200);

    expect(
      await prisma.matchParticipant.count({ where: { matchId: id, userId: joueur.id } })
    ).toBe(0);
    expect(
      await prisma.conversationParticipant.count({
        where: { conversationId: match!.conversationId!, userId: joueur.id },
      })
    ).toBe(0);
  });

  it("annuler: returns 403 for a non-organizer", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    const createResponse = await creer(creerRequest(payloadCreation(terrain.id)));
    const { id } = await createResponse.json();

    const autre = await creerUtilisateur("autre@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: autre.id } } as never);
    const response = await annuler(
      requeteAction(`/api/matchs/${id}/annuler`, { raison: "personnel" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(403);
  });

  it("annuler: returns 400 without a reason", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    const createResponse = await creer(creerRequest(payloadCreation(terrain.id)));
    const { id } = await createResponse.json();

    const response = await annuler(requeteAction(`/api/matchs/${id}/annuler`), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(400);
    expect(await prisma.annulation.count()).toBe(0);
    expect((await prisma.match.findUnique({ where: { id } }))?.statut).toBe("ouvert");
  });

  it("annuler: returns 400 when autre carries no precision", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    const createResponse = await creer(creerRequest(payloadCreation(terrain.id)));
    const { id } = await createResponse.json();

    const response = await annuler(
      requeteAction(`/api/matchs/${id}/annuler`, { raison: "autre" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Précisez le motif de l'annulation");
  });

  it("annuler: returns 200 for the organizer and records the reason", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    const createResponse = await creer(creerRequest(payloadCreation(terrain.id)));
    const { id } = await createResponse.json();

    const response = await annuler(
      requeteAction(`/api/matchs/${id}/annuler`, {
        raison: "autre",
        raisonAutre: "Terrain inondé",
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(200);

    const annulation = await prisma.annulation.findUnique({ where: { matchId: id } });
    expect(annulation?.raison).toBe("autre");
    expect(annulation?.raisonAutre).toBe("Terrain inondé");
    expect(annulation?.userId).toBe(org.id);
  });

  it("annuler: returns 409 when the match is already cancelled", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    const createResponse = await creer(creerRequest(payloadCreation(terrain.id)));
    const { id } = await createResponse.json();

    await annuler(requeteAction(`/api/matchs/${id}/annuler`, { raison: "personnel" }), {
      params: Promise.resolve({ id }),
    });
    const response = await annuler(
      requeteAction(`/api/matchs/${id}/annuler`, { raison: "personnel" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(409);
  });
});

describe("POST /api/matchs/[id]/reservation", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /** Match déjà terminé : date volontairement passée. */
  async function creerMatchPasse(organisateurId: string, terrainId: string) {
    return prisma.match.create({
      data: {
        terrainId,
        organisateurId,
        date: "2020-01-01",
        heureDebut: "18:00",
        heureFin: "19:30",
        format: "cinq",
        joueursMax: 10,
        organisateurParticipe: true,
      },
    });
  }

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await decider(
      requeteAction("/api/matchs/m1/reservation", { reserver: true }),
      { params: Promise.resolve({ id: "m1" }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 for a missing decision", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    const match = await creerMatchPasse(org.id, terrain.id);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);

    const response = await decider(requeteAction(`/api/matchs/${match.id}/reservation`), {
      params: Promise.resolve({ id: match.id }),
    });
    expect(response.status).toBe(400);
  });

  it("returns 403 for a non-organizer", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    const autre = await creerUtilisateur("autre@example.com");
    const match = await creerMatchPasse(org.id, terrain.id);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: autre.id } } as never);

    const response = await decider(
      requeteAction(`/api/matchs/${match.id}/reservation`, { reserver: true }),
      { params: Promise.resolve({ id: match.id }) }
    );
    expect(response.status).toBe(403);
  });

  it("returns 409 when the match is not over yet", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);
    const createResponse = await creer(creerRequest(payloadCreation(terrain.id)));
    const { id } = await createResponse.json();

    const response = await decider(
      requeteAction(`/api/matchs/${id}/reservation`, { reserver: true }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Ce match n'est pas encore terminé");
  });

  it("books the slot for the organizer and links the reservation", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    const match = await creerMatchPasse(org.id, terrain.id);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);

    const response = await decider(
      requeteAction(`/api/matchs/${match.id}/reservation`, { reserver: true }),
      { params: Promise.resolve({ id: match.id }) }
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reservationId).toBeTruthy();

    const apres = await prisma.match.findUnique({ where: { id: match.id } });
    expect(apres?.reservationId).toBe(body.reservationId);
    const reservation = await prisma.reservation.findUnique({ where: { id: body.reservationId } });
    expect(reservation?.userId).toBe(org.id);
    expect(reservation?.date).toBe("2020-01-01");
  });

  it("records a decline and refuses any later decision", async () => {
    const terrain = await creerTerrain();
    const org = await creerUtilisateur("org@example.com");
    const match = await creerMatchPasse(org.id, terrain.id);
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);

    const refus = await decider(
      requeteAction(`/api/matchs/${match.id}/reservation`, { reserver: false }),
      { params: Promise.resolve({ id: match.id }) }
    );
    expect(refus.status).toBe(200);
    expect((await refus.json()).reservationId).toBeNull();
    expect(await prisma.reservation.count()).toBe(0);

    const encore = await decider(
      requeteAction(`/api/matchs/${match.id}/reservation`, { reserver: true }),
      { params: Promise.resolve({ id: match.id }) }
    );
    expect(encore.status).toBe(409);
  });

  it("returns 404 for an unknown match", async () => {
    const org = await creerUtilisateur("org@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: org.id } } as never);

    const response = await decider(
      requeteAction("/api/matchs/inconnu/reservation", { reserver: true }),
      { params: Promise.resolve({ id: "inconnu" }) }
    );
    expect(response.status).toBe(404);
  });
});
