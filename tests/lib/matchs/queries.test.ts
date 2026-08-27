import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  creerMatch,
  rejoindreMatch,
  quitterMatch,
  annulerMatch,
  findMatchs,
  findMatchById,
  assurerConversationMatch,
  deciderReservationMatch,
} from "@/lib/matchs/queries";

vi.mock("@/lib/notifications/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notifications/queries")>();
  return { ...actual, creerNotification: vi.fn(actual.creerNotification) };
});
import { creerNotification } from "@/lib/notifications/queries";

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

async function creerUtilisateur(email: string, prenom = "Joueur") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom, ville: "Tunis" } },
    },
  });
}

type MatchOptions = {
  joueursMax?: number;
  organisateurParticipe?: boolean;
  date?: string;
  heureDebut?: string;
  heureFin?: string;
};

async function creerMatchDeTest(
  terrainId: string,
  organisateurId: string,
  options: MatchOptions = {}
) {
  return creerMatch({
    terrainId,
    organisateurId,
    date: options.date ?? "2026-09-07",
    heureDebut: options.heureDebut ?? "18:00",
    heureFin: options.heureFin ?? "19:30",
    format: "cinq",
    joueursMax: options.joueursMax ?? 10,
    organisateurParticipe: options.organisateurParticipe ?? true,
  });
}

describe("matchs/queries", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(creerNotification).mockClear();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a match with the organizer as the first participant", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");

    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });

    const detail = await findMatchById(id);
    expect(detail?.joueursInscrits).toBe(1);
    expect(detail?.participants[0].userId).toBe(organisateur.id);
    expect(detail?.statut).toBe("ouvert");
  });

  it("lets another player join an open match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 2 });

    const joueur = await creerUtilisateur("j@example.com");
    const resultat = await rejoindreMatch(id, joueur.id);

    expect(resultat).toEqual({ ok: true });
    const detail = await findMatchById(id);
    expect(detail?.joueursInscrits).toBe(2);
    expect(detail?.statut).toBe("complet");
  });

  it("rejects joining twice", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });

    const resultat = await rejoindreMatch(id, organisateur.id);
    expect(resultat).toEqual({ ok: false, raison: "deja_inscrit" });
  });

  it("rejects joining a full match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 1 });

    const joueur = await creerUtilisateur("j@example.com");
    const resultat = await rejoindreMatch(id, joueur.id);
    expect(resultat).toEqual({ ok: false, raison: "complet" });
  });

  it("allows exactly one of two players joining the last spot simultaneously", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      joueursMax: 2, // organisateur + une place restante
    });

    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    const [resultatA, resultatB] = await Promise.all([
      rejoindreMatch(id, userA.id),
      rejoindreMatch(id, userB.id),
    ]);

    const succes = [resultatA, resultatB].filter((r) => r.ok);
    expect(succes).toHaveLength(1);

    const total = await prisma.matchParticipant.count({ where: { matchId: id } });
    expect(total).toBe(2);
  });

  it("lets a participant leave, which reopens a full match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 2 });
    const joueur = await creerUtilisateur("j@example.com");
    await rejoindreMatch(id, joueur.id);

    const resultat = await quitterMatch(id, joueur.id);
    expect(resultat).toEqual({ ok: true });

    const detail = await findMatchById(id);
    expect(detail?.joueursInscrits).toBe(1);
    expect(detail?.statut).toBe("ouvert");
  });

  it("keeps statut consistent with the participant count when a leave races a join for the last spot", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });

    // Complète le match à 9 joueurs (organisateur inclus).
    const joueurs = [];
    for (let i = 0; i < 8; i++) {
      const joueur = await creerUtilisateur(`j${i}@example.com`);
      await rejoindreMatch(id, joueur.id);
      joueurs.push(joueur);
    }
    expect(await prisma.matchParticipant.count({ where: { matchId: id } })).toBe(9);

    const partant = joueurs[0];
    const dixieme = await creerUtilisateur("dixieme@example.com");

    // Invariant qui doit toujours tenir, quel que soit l'entrelacement des
    // deux transactions : jamais "complet" avec moins de joueursMax inscrits.
    // Ce test seul ne suffit pas à prouver la présence du verrou (voir le
    // test suivant, déterministe, pour cela) : rejoindreMatch verrouille déjà
    // la ligne Match et réévalue sa clause WHERE au réveil, ce qui referme
    // accidentellement la fenêtre de course même sans le verrou côté
    // quitterMatch — mais l'invariant lui-même reste ce que le produit exige,
    // et doit continuer à tenir après le correctif.
    await Promise.all([rejoindreMatch(id, dixieme.id), quitterMatch(id, partant.id)]);

    const detail = await findMatchById(id);
    if (detail!.statut === "complet") {
      expect(detail!.joueursInscrits).toBeGreaterThanOrEqual(detail!.joueursMax);
    }
    expect(detail!.joueursInscrits).toBe(9);
    expect(detail!.statut).toBe("ouvert");
  });

  it("locks the match row as its very first statement, blocking until a concurrent holder releases it", async () => {
    // Preuve directe et déterministe du verrou (contrairement au test
    // précédent, dont l'issue ne dépend pas que de lui) : on prend
    // manuellement le verrou SELECT … FOR UPDATE sur la ligne Match, puis on
    // lance quitterMatch. S'il verrouille bien cette ligne en premier lieu,
    // il doit rester bloqué tant que nous ne relâchons pas notre verrou —
    // sans le verrou (régression), rien ne le retiendrait : sa première
    // requête porte sur MatchParticipant, une autre table, et il se
    // terminerait bien avant que nous ne relâchions le nôtre.
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });
    const joueur = await creerUtilisateur("j@example.com");
    await rejoindreMatch(id, joueur.id);

    const ordre: string[] = [];
    let libererVerrou: () => void = () => {};
    const verrouLibere = new Promise<void>((resolve) => {
      libererVerrou = resolve;
    });

    const detenteur = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Match" WHERE id = ${id} FOR UPDATE`;
      await verrouLibere;
      ordre.push("verrou-relache");
    });

    // Laisse le temps à la transaction détentrice d'obtenir effectivement le
    // verrou avant de lancer quitterMatch.
    await new Promise((resolve) => setTimeout(resolve, 100));

    const depart = quitterMatch(id, joueur.id).then((resultat) => {
      ordre.push("quitterMatch-termine");
      return resultat;
    });

    // Laisse à quitterMatch largement le temps de terminer s'il n'attend pas
    // le verrou : avec le correctif, il doit rester bloqué ici.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(ordre).toEqual([]);

    libererVerrou();
    const [, resultatDepart] = await Promise.all([detenteur, depart]);

    expect(resultatDepart).toEqual({ ok: true });
    expect(ordre).toEqual(["verrou-relache", "quitterMatch-termine"]);
  });

  it("lets the organizer cancel the match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });

    const resultat = await annulerMatch({ matchId: id, userId: organisateur.id, raison: "pas_assez_joueurs" });
    expect(resultat).toEqual({ ok: true });

    const detail = await findMatchById(id);
    expect(detail?.statut).toBe("annule");
  });

  it("refuses to let a non-organizer cancel the match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });
    const autre = await creerUtilisateur("autre@example.com");

    const resultat = await annulerMatch({ matchId: id, userId: autre.id, raison: "personnel" });
    expect(resultat).toEqual({ ok: false, raison: "non_autorise" });
  });

  it("excludes cancelled matches from findMatchs", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });
    await annulerMatch({ matchId: id, userId: organisateur.id, raison: "personnel" });

    const resultats = await findMatchs({});
    expect(resultats).toHaveLength(0);
  });

  it("stores a booking decision timestamp and resets Annulation rows between tests", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const match = await prisma.match.create({
      data: {
        terrainId: terrain.id,
        organisateurId: organisateur.id,
        date: "2020-01-01",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
      },
    });

    expect(match.decisionReservationAt).toBeNull();

    await prisma.annulation.create({
      data: { matchId: match.id, userId: organisateur.id, raison: "personnel" },
    });
    await resetDb();
    expect(await prisma.annulation.count()).toBe(0);
  });

  it("records the format and keeps the organizer as a participant when they play", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");

    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      joueursMax: 10,
      organisateurParticipe: true,
    });

    const detail = await findMatchById(id);
    expect(detail?.format).toBe("cinq");
    expect(detail?.organisateurParticipe).toBe(true);
    expect(detail?.joueursInscrits).toBe(1);
    expect(detail?.joueursManquants).toBe(9);
  });

  it("does not take a player slot when the organizer only organizes", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");

    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      joueursMax: 10,
      organisateurParticipe: false,
    });

    const detail = await findMatchById(id);
    expect(detail?.organisateurParticipe).toBe(false);
    expect(detail?.joueursInscrits).toBe(0);
    expect(detail?.joueursManquants).toBe(10);
    expect(detail?.participants).toHaveLength(0);
  });

  it("creates a group conversation with the organizer inside, even when they do not play", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");

    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      organisateurParticipe: false,
    });

    const match = await prisma.match.findUnique({
      where: { id },
      include: { conversation: { include: { participants: true } } },
    });

    expect(match?.conversationId).toBeTruthy();
    expect(match?.conversation?.estGroupe).toBe(true);
    expect(match?.conversation?.nom).toBe("Match · Terrain Test · 2026-09-07");
    expect(match?.conversation?.participants.map((p) => p.userId)).toEqual([organisateur.id]);
  });

  it("never reports a negative number of missing players", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 2 });
    const joueur = await creerUtilisateur("j@example.com");
    await rejoindreMatch(id, joueur.id);
    // Une place supplémentaire occupée en base, hors du chemin normal, pour
    // vérifier que le calcul est borné et ne descend jamais sous zéro.
    const intrus = await creerUtilisateur("intrus@example.com");
    await prisma.matchParticipant.create({ data: { matchId: id, userId: intrus.id } });

    const detail = await findMatchById(id);
    expect(detail?.joueursInscrits).toBe(3);
    expect(detail?.joueursManquants).toBe(0);

    const [resume] = await findMatchs({});
    expect(resume.joueursManquants).toBe(0);
    expect(resume.format).toBe("cinq");
    expect(resume.organisateurParticipe).toBe(true);
  });

  it("reports estTermine and decisionPrise from the match end time and the stored decision", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      date: "2026-09-07",
      heureFin: "19:30",
    });

    const avant = await findMatchById(id, new Date(2026, 8, 7, 19, 29));
    expect(avant?.estTermine).toBe(false);
    expect(avant?.decisionPrise).toBe(false);

    const apres = await findMatchById(id, new Date(2026, 8, 7, 19, 31));
    expect(apres?.estTermine).toBe(true);
    expect(apres?.decisionPrise).toBe(false);

    await prisma.match.update({
      where: { id },
      data: { decisionReservationAt: new Date() },
    });
    const decide = await findMatchById(id, new Date(2026, 8, 7, 19, 31));
    expect(decide?.decisionPrise).toBe(true);
  });

  it("lazily creates and links a conversation for a legacy match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const joueur = await creerUtilisateur("j@example.com");

    // Match « legacy » : créé directement en base, sans conversation, comme
    // ceux qui existaient avant cette vague.
    const legacy = await prisma.match.create({
      data: {
        terrainId: terrain.id,
        organisateurId: organisateur.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
        participants: { create: [{ userId: organisateur.id }, { userId: joueur.id }] },
      },
    });
    expect(legacy.conversationId).toBeNull();

    const conversationId = await assurerConversationMatch(legacy.id);
    expect(conversationId).toBeTruthy();

    const membres = await prisma.conversationParticipant.findMany({
      where: { conversationId: conversationId! },
      select: { userId: true },
    });
    expect(membres.map((m) => m.userId).sort()).toEqual([organisateur.id, joueur.id].sort());

    // Idempotent : un second appel réutilise la conversation existante.
    expect(await assurerConversationMatch(legacy.id)).toBe(conversationId);
    expect(await prisma.conversation.count({ where: { estGroupe: true } })).toBe(1);
  });

  it("returns null from assurerConversationMatch for an unknown match", async () => {
    expect(await assurerConversationMatch("inconnu")).toBeNull();
  });

  it("creates exactly one conversation when two callers race on the same legacy match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");

    // Match « legacy », comme dans le test précédent. Sans le verrou
    // SELECT … FOR UPDATE pris par assurerConversationMatch, les deux appels
    // liraient tous les deux conversationId = null, créeraient chacun leur
    // propre Conversation, et seul l'un des deux gagnerait la contrainte
    // d'unicité sur Match.conversationId — l'autre conversation resterait
    // orpheline, jamais liée à aucun match.
    const legacy = await prisma.match.create({
      data: {
        terrainId: terrain.id,
        organisateurId: organisateur.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
        participants: { create: [{ userId: organisateur.id }] },
      },
    });

    const [idA, idB] = await Promise.all([
      assurerConversationMatch(legacy.id),
      assurerConversationMatch(legacy.id),
    ]);

    expect(idA).toBeTruthy();
    expect(idA).toBe(idB);
    expect(await prisma.conversation.count({ where: { estGroupe: true } })).toBe(1);
  });

  it("adds the joining player to the match conversation in the same transaction", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });
    const joueur = await creerUtilisateur("j@example.com");

    expect(await rejoindreMatch(id, joueur.id)).toEqual({ ok: true });

    const detail = await findMatchById(id);
    const membres = await prisma.conversationParticipant.findMany({
      where: { conversationId: detail!.conversationId! },
      select: { userId: true },
    });
    expect(membres.map((m) => m.userId).sort()).toEqual([organisateur.id, joueur.id].sort());
  });

  it("creates the conversation on first join for a legacy match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const legacy = await prisma.match.create({
      data: {
        terrainId: terrain.id,
        organisateurId: organisateur.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
        joueursMax: 10,
        participants: { create: [{ userId: organisateur.id }] },
      },
    });
    const joueur = await creerUtilisateur("j@example.com");

    expect(await rejoindreMatch(legacy.id, joueur.id)).toEqual({ ok: true });

    const detail = await findMatchById(legacy.id);
    expect(detail?.conversationId).toBeTruthy();
    const membres = await prisma.conversationParticipant.findMany({
      where: { conversationId: detail!.conversationId! },
      select: { userId: true },
    });
    expect(membres.map((m) => m.userId).sort()).toEqual([organisateur.id, joueur.id].sort());
  });

  it("does not add anyone to the conversation when the join is refused", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 1 });
    const joueur = await creerUtilisateur("j@example.com");

    expect(await rejoindreMatch(id, joueur.id)).toEqual({ ok: false, raison: "complet" });

    const detail = await findMatchById(id);
    const membres = await prisma.conversationParticipant.findMany({
      where: { conversationId: detail!.conversationId! },
    });
    expect(membres).toHaveLength(1);
  });

  it("keeps exactly one conversation membership when two players race for the last spot", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 2 });

    const userA = await creerUtilisateur("a@example.com");
    const userB = await creerUtilisateur("b@example.com");

    const [resultatA, resultatB] = await Promise.all([
      rejoindreMatch(id, userA.id),
      rejoindreMatch(id, userB.id),
    ]);

    expect([resultatA, resultatB].filter((r) => r.ok)).toHaveLength(1);

    const detail = await findMatchById(id);
    const membres = await prisma.conversationParticipant.count({
      where: { conversationId: detail!.conversationId! },
    });
    // Organisateur + le seul gagnant de la course.
    expect(membres).toBe(2);
    expect(detail?.joueursInscrits).toBe(2);
  });

  it("removes a leaving player from the conversation but keeps the organizer in it", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });
    const joueur = await creerUtilisateur("j@example.com");
    await rejoindreMatch(id, joueur.id);

    expect(await quitterMatch(id, joueur.id)).toEqual({ ok: true });

    const detail = await findMatchById(id);
    const apresDepart = await prisma.conversationParticipant.findMany({
      where: { conversationId: detail!.conversationId! },
      select: { userId: true },
    });
    expect(apresDepart.map((m) => m.userId)).toEqual([organisateur.id]);

    // L'organisateur libère sa place de joueur : il reste dans la discussion.
    expect(await quitterMatch(id, organisateur.id)).toEqual({ ok: true });
    const apresOrganisateur = await prisma.conversationParticipant.findMany({
      where: { conversationId: detail!.conversationId! },
      select: { userId: true },
    });
    expect(apresOrganisateur.map((m) => m.userId)).toEqual([organisateur.id]);
    expect((await findMatchById(id))?.joueursInscrits).toBe(0);
  });

  it("records an Annulation row queryable by matchId and userId", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });

    expect(
      await annulerMatch({
        matchId: id,
        userId: organisateur.id,
        raison: "terrain_indisponible",
      })
    ).toEqual({ ok: true });

    const parMatch = await prisma.annulation.findUnique({ where: { matchId: id } });
    expect(parMatch?.raison).toBe("terrain_indisponible");
    expect(parMatch?.raisonAutre).toBeNull();
    expect(parMatch?.userId).toBe(organisateur.id);
    expect(parMatch?.reservationId).toBeNull();

    const parUtilisateur = await prisma.annulation.findMany({
      where: { userId: organisateur.id },
    });
    expect(parUtilisateur).toHaveLength(1);
    expect((await findMatchById(id))?.statut).toBe("annule");
  });

  it("stores the free-text precision only for the autre reason", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id);

    expect(
      await annulerMatch({
        matchId: id,
        userId: organisateur.id,
        raison: "autre",
        raisonAutre: "  Pluie battante  ",
      })
    ).toEqual({ ok: true });

    const annulation = await prisma.annulation.findUnique({ where: { matchId: id } });
    expect(annulation?.raison).toBe("autre");
    expect(annulation?.raisonAutre).toBe("Pluie battante");
  });

  it("refuses the autre reason without a precision", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id);

    expect(
      await annulerMatch({ matchId: id, userId: organisateur.id, raison: "autre" })
    ).toEqual({ ok: false, raison: "raison_autre_requise" });
    expect(await prisma.annulation.count()).toBe(0);
    expect((await findMatchById(id))?.statut).toBe("ouvert");
  });

  it("refuses to cancel an already cancelled match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id);
    await annulerMatch({ matchId: id, userId: organisateur.id, raison: "personnel" });

    expect(
      await annulerMatch({ matchId: id, userId: organisateur.id, raison: "conflit_horaire" })
    ).toEqual({ ok: false, raison: "deja_annule" });
    expect(await prisma.annulation.count()).toBe(1);
  });

  it("annulerMatch returns introuvable for an unknown match", async () => {
    expect(
      await annulerMatch({ matchId: "inconnu", userId: "u1", raison: "personnel" })
    ).toEqual({ ok: false, raison: "introuvable" });
  });

  it("notifies every other participant with the reason, but not the canceller", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });
    const joueurA = await creerUtilisateur("a@example.com");
    const joueurB = await creerUtilisateur("b@example.com");
    await rejoindreMatch(id, joueurA.id);
    await rejoindreMatch(id, joueurB.id);

    await annulerMatch({
      matchId: id,
      userId: organisateur.id,
      raison: "pas_assez_joueurs",
    });

    const notifsA = await prisma.notification.findMany({ where: { userId: joueurA.id } });
    expect(notifsA).toHaveLength(1);
    expect(notifsA[0].type).toBe("annulation_match");
    expect(notifsA[0].contenu).toContain("Pas assez de joueurs");
    expect(notifsA[0].lien).toBe(`/matchs/${id}`);

    expect(await prisma.notification.count({ where: { userId: joueurB.id } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: organisateur.id } })).toBe(0);
  });

  it("notifies participants even when the organizer does not play", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      joueursMax: 10,
      organisateurParticipe: false,
    });
    const joueur = await creerUtilisateur("a@example.com");
    await rejoindreMatch(id, joueur.id);

    await annulerMatch({
      matchId: id,
      userId: organisateur.id,
      raison: "autre",
      raisonAutre: "Terrain inondé",
    });

    const notifs = await prisma.notification.findMany({ where: { userId: joueur.id } });
    expect(notifs).toHaveLength(1);
    expect(notifs[0].contenu).toContain("Terrain inondé");
  });

  it("isolates a notification failure per recipient: the second participant still gets notified", async () => {
    // Régression : annulerMatch enveloppe chaque appel à creerNotification
    // dans son propre try/catch, à l'intérieur de la boucle — un échec pour
    // un destinataire ne doit ni annuler l'annulation déjà écrite, ni empêcher
    // les notifications suivantes de partir. Un correctif naïf qui englobe
    // toute la boucle dans un seul try/catch ferait échouer ce test : la
    // deuxième notification ne serait jamais tentée.
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, { joueursMax: 10 });
    const joueurA = await creerUtilisateur("a@example.com");
    const joueurB = await creerUtilisateur("b@example.com");
    await rejoindreMatch(id, joueurA.id);
    await rejoindreMatch(id, joueurB.id);

    vi.mocked(creerNotification).mockRejectedValueOnce(new Error("boom"));

    const resultat = await annulerMatch({
      matchId: id,
      userId: organisateur.id,
      raison: "pas_assez_joueurs",
    });
    expect(resultat).toEqual({ ok: true });

    const annulation = await prisma.annulation.findUnique({ where: { matchId: id } });
    expect(annulation).not.toBeNull();
    expect((await findMatchById(id))?.statut).toBe("annule");

    // Le premier appel (mocké en échec) ne doit pas empêcher le second : les
    // deux destinataires doivent avoir été tentés, et celui du second appel
    // doit avoir réellement reçu sa notification en base.
    expect(creerNotification).toHaveBeenCalledTimes(2);
    const appels = vi.mocked(creerNotification).mock.calls;
    const premierDestinataireId = (appels[0][0] as { userId: string }).userId;
    const secondDestinataireId = (appels[1][0] as { userId: string }).userId;
    expect([joueurA.id, joueurB.id]).toContain(premierDestinataireId);
    expect([joueurA.id, joueurB.id]).toContain(secondDestinataireId);
    expect(secondDestinataireId).not.toBe(premierDestinataireId);

    const notifsSecond = await prisma.notification.findMany({
      where: { userId: secondDestinataireId },
    });
    expect(notifsSecond).toHaveLength(1);
    expect(notifsSecond[0].type).toBe("annulation_match");

    // Le premier destinataire, dont l'appel a échoué, n'a rien reçu.
    const notifsPremier = await prisma.notification.findMany({
      where: { userId: premierDestinataireId },
    });
    expect(notifsPremier).toHaveLength(0);
  });

  it("refuses a booking decision before the match is over", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
    });

    expect(
      await deciderReservationMatch(id, organisateur.id, true, new Date(2026, 8, 7, 19, 29))
    ).toEqual({ ok: false, raison: "pas_termine" });
    expect(await prisma.reservation.count()).toBe(0);
  });

  it("refuses a booking decision from anyone but the organizer", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const autre = await creerUtilisateur("autre@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id);

    expect(
      await deciderReservationMatch(id, autre.id, true, new Date(2026, 8, 8, 12, 0))
    ).toEqual({ ok: false, raison: "non_autorise" });
  });

  it("refuses a booking decision on a cancelled match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id);
    await annulerMatch({ matchId: id, userId: organisateur.id, raison: "personnel" });

    expect(
      await deciderReservationMatch(id, organisateur.id, true, new Date(2026, 8, 8, 12, 0))
    ).toEqual({ ok: false, raison: "annule" });
  });

  it("creates a real reservation for the terrain slot and links it to the match", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
    });

    const resultat = await deciderReservationMatch(
      id,
      organisateur.id,
      true,
      new Date(2026, 8, 7, 20, 0)
    );
    expect(resultat.ok).toBe(true);

    const match = await prisma.match.findUnique({ where: { id } });
    expect(match?.reservationId).toBeTruthy();
    expect(match?.decisionReservationAt).not.toBeNull();

    const reservation = await prisma.reservation.findUnique({
      where: { id: match!.reservationId! },
    });
    expect(reservation).toMatchObject({
      terrainId: terrain.id,
      userId: organisateur.id,
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
      statut: "confirmee",
    });

    const detail = await findMatchById(id, new Date(2026, 8, 7, 20, 0));
    expect(detail?.decisionPrise).toBe(true);
    expect(detail?.reservationId).toBe(match!.reservationId);
  });

  it("records an explicit decline without creating a reservation, and stops asking", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id);

    expect(
      await deciderReservationMatch(id, organisateur.id, false, new Date(2026, 8, 7, 20, 0))
    ).toEqual({ ok: true, reservationId: null });

    expect(await prisma.reservation.count()).toBe(0);
    const detail = await findMatchById(id, new Date(2026, 8, 7, 20, 0));
    expect(detail?.decisionPrise).toBe(true);
    expect(detail?.reservationId).toBeNull();

    expect(
      await deciderReservationMatch(id, organisateur.id, true, new Date(2026, 8, 7, 20, 5))
    ).toEqual({ ok: false, raison: "deja_decide" });
    expect(await prisma.reservation.count()).toBe(0);
  });

  it("refuses a second decision after a booking", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id);
    await deciderReservationMatch(id, organisateur.id, true, new Date(2026, 8, 7, 20, 0));

    expect(
      await deciderReservationMatch(id, organisateur.id, false, new Date(2026, 8, 7, 20, 5))
    ).toEqual({ ok: false, raison: "deja_decide" });
    expect(await prisma.reservation.count()).toBe(1);
  });

  it("reports a conflict and leaves the decision open when the slot is already booked", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const autre = await creerUtilisateur("autre@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
    });

    await prisma.reservation.create({
      data: {
        terrainId: terrain.id,
        userId: autre.id,
        date: "2026-09-07",
        heureDebut: "18:00",
        heureFin: "19:30",
      },
    });

    expect(
      await deciderReservationMatch(id, organisateur.id, true, new Date(2026, 8, 7, 20, 0))
    ).toEqual({ ok: false, raison: "conflit" });

    const match = await prisma.match.findUnique({ where: { id } });
    expect(match?.reservationId).toBeNull();
    // La décision reste ouverte : l'organisateur doit pouvoir refuser ensuite.
    expect(match?.decisionReservationAt).toBeNull();
    expect(await prisma.reservation.count()).toBe(1);

    expect(
      await deciderReservationMatch(id, organisateur.id, false, new Date(2026, 8, 7, 20, 1))
    ).toEqual({ ok: true, reservationId: null });
  });

  it("deciderReservationMatch returns introuvable for an unknown match", async () => {
    expect(
      await deciderReservationMatch("inconnu", "u1", true, new Date(2026, 8, 7, 20, 0))
    ).toEqual({ ok: false, raison: "introuvable" });
  });

  it("allows exactly one of two simultaneous booking decisions to create a reservation", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
    });
    const maintenant = new Date(2026, 8, 7, 20, 0);

    // Sans le verrou SELECT … FOR UPDATE, les deux appels liraient tous les
    // deux decisionReservationAt = null, passeraient tous les deux le garde
    // "deja_decide", et créeraient chacun leur propre Reservation pour un
    // seul et même match.
    const [resultatA, resultatB] = await Promise.all([
      deciderReservationMatch(id, organisateur.id, true, maintenant),
      deciderReservationMatch(id, organisateur.id, true, maintenant),
    ]);

    const succes = [resultatA, resultatB].filter((r) => r.ok);
    const echecs = [resultatA, resultatB].filter((r) => !r.ok);
    expect(succes).toHaveLength(1);
    expect(echecs).toEqual([{ ok: false, raison: "deja_decide" }]);
    expect(await prisma.reservation.count()).toBe(1);

    const gagnant = succes[0] as { ok: true; reservationId: string | null };
    expect(gagnant.reservationId).toBeTruthy();

    const match = await prisma.match.findUnique({ where: { id } });
    expect(match?.reservationId).toBe(gagnant.reservationId);
  });

  it("treats the exact end instant of the slot as already over, consistently with estTermine", async () => {
    const terrain = await creerTerrain();
    const organisateur = await creerUtilisateur("org@example.com");
    const { id } = await creerMatchDeTest(terrain.id, organisateur.id, {
      date: "2026-09-07",
      heureDebut: "18:00",
      heureFin: "19:30",
    });
    // Exactement l'instant de fin du créneau : ni avant, ni après.
    const finExacte = new Date(2026, 8, 7, 19, 30);

    const detail = await findMatchById(id, finExacte);
    expect(detail?.estTermine).toBe(true);

    const resultat = await deciderReservationMatch(id, organisateur.id, false, finExacte);
    expect(resultat).toEqual({ ok: true, reservationId: null });
  });
});
