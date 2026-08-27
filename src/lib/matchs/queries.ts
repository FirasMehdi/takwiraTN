import type { FormatEquipe, Prisma, RaisonAnnulation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { creerNotification } from "@/lib/notifications/queries";
import { libelleRaisonAnnulation } from "@/lib/annulations/libelles";
import { creerReservation } from "@/lib/reservations/queries";

export type MatchResume = {
  id: string;
  terrainId: string;
  terrainNom: string;
  terrainVille: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  /** Null pour les matchs créés avant que le format soit obligatoire. */
  format: FormatEquipe | null;
  joueursMax: number;
  /** Nombre de MatchParticipant — la seule source de vérité pour « joueurs trouvés ». */
  joueursInscrits: number;
  /** joueursMax − joueursInscrits, borné à zéro. */
  joueursManquants: number;
  /** L'organisateur occupe-t-il une des places recherchées ? */
  organisateurParticipe: boolean;
  statut: "ouvert" | "complet" | "annule";
};

export type MatchDetail = MatchResume & {
  description: string | null;
  organisateurId: string;
  organisateurPrenom: string;
  conversationId: string | null;
  reservationId: string | null;
  /** Le créneau est passé : date + heureFin est antérieur ou égal à « maintenant ». */
  estTermine: boolean;
  /** L'organisateur a déjà tranché la question de la réservation de fin de match. */
  decisionPrise: boolean;
  participants: { userId: string; prenom: string }[];
};

function joueursManquants(joueursMax: number, joueursInscrits: number): number {
  return Math.max(0, joueursMax - joueursInscrits);
}

/**
 * "YYYY-MM-DD" + "HH:MM" locale → Date locale (pas d'aller-retour par l'UTC).
 * Copie délibérée du helper privé de src/lib/reservations/queries.ts : quatre
 * lignes, et hisser un module de dates partagé pendant cette vague entrerait
 * en collision avec les sous-projets développés en parallèle.
 */
function versDateLocale(date: string, heure: string): Date {
  const [annee, mois, jour] = date.split("-").map(Number);
  const [h, m] = heure.split(":").map(Number);
  return new Date(annee, mois - 1, jour, h, m);
}

export async function findMatchs(query: {
  date?: string;
  ville?: string;
}): Promise<MatchResume[]> {
  const where: Prisma.MatchWhereInput = { statut: { in: ["ouvert", "complet"] } };
  if (query.date) where.date = query.date;
  if (query.ville) {
    where.terrain = { ville: { equals: query.ville, mode: "insensitive" } };
  }

  const matchs = await prisma.match.findMany({
    where,
    include: {
      terrain: { select: { nom: true, ville: true } },
      _count: { select: { participants: true } },
    },
    orderBy: [{ date: "asc" }, { heureDebut: "asc" }],
    take: 100,
  });

  return matchs.map((m) => ({
    id: m.id,
    terrainId: m.terrainId,
    terrainNom: m.terrain.nom,
    terrainVille: m.terrain.ville,
    date: m.date,
    heureDebut: m.heureDebut,
    heureFin: m.heureFin,
    format: m.format,
    joueursMax: m.joueursMax,
    joueursInscrits: m._count.participants,
    joueursManquants: joueursManquants(m.joueursMax, m._count.participants),
    organisateurParticipe: m.organisateurParticipe,
    statut: m.statut,
  }));
}

export async function findMatchById(
  id: string,
  maintenant: Date = new Date()
): Promise<MatchDetail | null> {
  const m = await prisma.match.findUnique({
    where: { id },
    include: {
      terrain: { select: { nom: true, ville: true } },
      organisateur: { select: { profile: { select: { prenom: true } } } },
      participants: {
        include: { user: { select: { profile: { select: { prenom: true } } } } },
      },
    },
  });
  if (!m) return null;

  const inscrits = m.participants.length;

  return {
    id: m.id,
    terrainId: m.terrainId,
    terrainNom: m.terrain.nom,
    terrainVille: m.terrain.ville,
    date: m.date,
    heureDebut: m.heureDebut,
    heureFin: m.heureFin,
    format: m.format,
    joueursMax: m.joueursMax,
    joueursInscrits: inscrits,
    joueursManquants: joueursManquants(m.joueursMax, inscrits),
    organisateurParticipe: m.organisateurParticipe,
    statut: m.statut,
    description: m.description,
    organisateurId: m.organisateurId,
    organisateurPrenom: m.organisateur.profile?.prenom ?? "Organisateur",
    conversationId: m.conversationId,
    reservationId: m.reservationId,
    estTermine: versDateLocale(m.date, m.heureFin).getTime() <= maintenant.getTime(),
    decisionPrise: m.decisionReservationAt !== null || m.reservationId !== null,
    participants: m.participants.map((p) => ({
      userId: p.userId,
      prenom: p.user.profile?.prenom ?? "Joueur",
    })),
  };
}

type MatchPourConversation = {
  id: string;
  terrainId: string;
  organisateurId: string;
  date: string;
};

/**
 * Crée la discussion de groupe d'un match, y inscrit l'organisateur ainsi que
 * tous les participants déjà présents, puis la lie au match.
 *
 * À n'appeler que depuis une transaction ayant déjà verrouillé la ligne Match
 * (SELECT … FOR UPDATE) : sans ce verrou, deux appels concurrents créeraient
 * deux conversations pour le même match, et l'unicité de Match.conversationId
 * n'en attraperait qu'une seule des deux (l'autre resterait orpheline).
 * Exception : `creerMatch` l'appelle juste après avoir inséré la ligne Match
 * dans cette même transaction — cette ligne n'est encore visible d'aucune
 * autre transaction, donc aucun appel concurrent ne peut la disputer sans
 * verrou explicite.
 */
async function creerConversationPourMatch(
  tx: Prisma.TransactionClient,
  match: MatchPourConversation
): Promise<string> {
  const terrain = await tx.terrain.findUnique({
    where: { id: match.terrainId },
    select: { nom: true },
  });

  const participants = await tx.matchParticipant.findMany({
    where: { matchId: match.id },
    select: { userId: true },
  });
  // L'organisateur est membre de la discussion qu'il joue ou non : c'est lui
  // qui l'anime.
  const membres = new Set<string>([match.organisateurId, ...participants.map((p) => p.userId)]);

  const conversation = await tx.conversation.create({
    data: {
      estGroupe: true,
      nom: `Match · ${terrain?.nom ?? "Terrain"} · ${match.date}`,
      participants: { create: [...membres].map((userId) => ({ userId })) },
    },
  });

  await tx.match.update({
    where: { id: match.id },
    data: { conversationId: conversation.id },
  });

  return conversation.id;
}

/**
 * Garantit qu'un match possède une discussion de groupe, et renvoie son id
 * (ou null si le match n'existe pas). Les matchs créés avant cette vague n'en
 * ont pas : plutôt qu'une migration de masse, on la crée à la volée au
 * premier accès — premier join ou première consultation de la fiche.
 */
export async function assurerConversationMatch(matchId: string): Promise<string | null> {
  // Chemin rapide, sans transaction ni verrou : le cas courant est « la
  // conversation existe déjà », et la fiche match appelle cette fonction à
  // chaque affichage.
  const existant = await prisma.match.findUnique({
    where: { id: matchId },
    select: { conversationId: true },
  });
  if (!existant) return null;
  if (existant.conversationId) return existant.conversationId;

  return prisma.$transaction(async (tx) => {
    const verrou = await tx.$queryRaw<
      {
        id: string;
        terrainId: string;
        organisateurId: string;
        date: string;
        conversationId: string | null;
      }[]
    >`
      SELECT id, "terrainId", "organisateurId", date, "conversationId"
      FROM "Match" WHERE id = ${matchId} FOR UPDATE
    `;
    const match = verrou[0];
    if (!match) return null;
    if (match.conversationId) return match.conversationId;
    return creerConversationPourMatch(tx, match);
  });
}

export type CreerMatchInput = {
  terrainId: string;
  organisateurId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  format: FormatEquipe;
  joueursMax: number;
  /** true : l'organisateur joue et occupe une place. false : il organise seulement. */
  organisateurParticipe: boolean;
  description?: string;
};

export async function creerMatch(input: CreerMatchInput): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.match.create({
      data: {
        terrainId: input.terrainId,
        organisateurId: input.organisateurId,
        date: input.date,
        heureDebut: input.heureDebut,
        heureFin: input.heureFin,
        format: input.format,
        joueursMax: input.joueursMax,
        organisateurParticipe: input.organisateurParticipe,
        description: input.description,
      },
    });

    // L'organisateur n'occupe une place que s'il a déclaré jouer. Sinon il
    // organise sans compter dans l'effectif recherché — c'est tout ce qui
    // distingue les deux cas, le comptage « joueurs trouvés » découle
    // ensuite naturellement du nombre de MatchParticipant.
    if (input.organisateurParticipe) {
      await tx.matchParticipant.create({
        data: { matchId: created.id, userId: input.organisateurId },
      });
    }

    // La discussion de groupe naît avec le match, dans la même transaction :
    // aucun match ne doit exister sans son fil de discussion. On réutilise
    // creerConversationPourMatch plutôt que de dupliquer ici sa logique de
    // nommage et d'inscription des membres — elle relit d'elle-même le
    // MatchParticipant qu'on vient de créer (zéro ou un, selon
    // organisateurParticipe) et lie la conversation au match.
    await creerConversationPourMatch(tx, created);

    return { id: created.id };
  });
}

export type RejoindreResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "complet" | "deja_inscrit" };

export async function rejoindreMatch(
  matchId: string,
  userId: string
): Promise<RejoindreResultat> {
  return prisma.$transaction(async (tx) => {
    // Verrouille la ligne du match pour la durée de la transaction : deux
    // tentatives simultanées de prendre la dernière place sont ainsi
    // sérialisées — la seconde relit un compte à jour après que la première
    // a validé, au lieu de lire un instantané périmé. Un index unique ne
    // peut pas exprimer une contrainte de comptage ("au plus N lignes liées
    // à ce match"), contrairement au cas de la réservation de créneaux —
    // c'est pourquoi le mécanisme diffère ici. Le même verrou sérialise
    // aussi la création paresseuse de la discussion de groupe plus bas.
    const verrou = await tx.$queryRaw<
      {
        id: string;
        terrainId: string;
        organisateurId: string;
        date: string;
        statut: string;
        joueursMax: number;
        conversationId: string | null;
      }[]
    >`
      SELECT id, "terrainId", "organisateurId", date, statut, "joueursMax", "conversationId"
      FROM "Match" WHERE id = ${matchId} FOR UPDATE
    `;
    const match = verrou[0];
    if (!match || match.statut === "annule") {
      return { ok: false, raison: "introuvable" } as const;
    }

    const dejaInscrit = await tx.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });
    if (dejaInscrit) return { ok: false, raison: "deja_inscrit" } as const;

    const inscrits = await tx.matchParticipant.count({ where: { matchId } });
    if (inscrits >= match.joueursMax) {
      return { ok: false, raison: "complet" } as const;
    }

    await tx.matchParticipant.create({ data: { matchId, userId } });

    // Match legacy sans discussion (créé avant cette vague) : on la crée ici,
    // sous le verrou déjà pris, plutôt que par une migration de masse. Comme
    // l'inscription vient d'être écrite, le nouveau venu y est inclus.
    const conversationId =
      match.conversationId ?? (await creerConversationPourMatch(tx, match));

    // Même transaction que l'inscription : rejoindre le match et rejoindre sa
    // discussion réussissent ou échouent ensemble. upsert plutôt que create,
    // parce que la création paresseuse ci-dessus a pu déjà inscrire ce joueur.
    await tx.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId, userId } },
      create: { conversationId, userId },
      update: {},
    });

    if (inscrits + 1 >= match.joueursMax) {
      await tx.match.update({ where: { id: matchId }, data: { statut: "complet" } });
    }

    return { ok: true } as const;
  });
}

export type QuitterResultat = { ok: true } | { ok: false; raison: "introuvable" };

export async function quitterMatch(matchId: string, userId: string): Promise<QuitterResultat> {
  return prisma.$transaction(async (tx) => {
    const participation = await tx.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId } },
    });
    if (!participation) return { ok: false, raison: "introuvable" } as const;

    await tx.matchParticipant.delete({ where: { id: participation.id } });

    const match = await tx.match.findUnique({
      where: { id: matchId },
      select: { organisateurId: true, conversationId: true },
    });

    // Quitter le match, c'est aussi quitter sa discussion — sauf pour
    // l'organisateur, qui reste dans le fil qu'il anime même s'il libère sa
    // place de joueur.
    if (match?.conversationId && match.organisateurId !== userId) {
      await tx.conversationParticipant.deleteMany({
        where: { conversationId: match.conversationId, userId },
      });
    }

    // Un départ rouvre un match complet.
    await tx.match.updateMany({
      where: { id: matchId, statut: "complet" },
      data: { statut: "ouvert" },
    });

    return { ok: true } as const;
  });
}

export type AnnulerMatchInput = {
  matchId: string;
  userId: string;
  raison: RaisonAnnulation;
  /** Obligatoire — et seulement utilisé — quand raison vaut "autre". */
  raisonAutre?: string;
};

export type AnnulerMatchResultat =
  | { ok: true }
  | {
      ok: false;
      raison: "introuvable" | "non_autorise" | "deja_annule" | "raison_autre_requise";
    };

/**
 * Annulation du match entier par son organisateur. Un motif est obligatoire :
 * il est enregistré dans Annulation, la table unifiée qui sert aussi aux
 * annulations de réservation, et reste interrogeable par matchId / userId.
 *
 * Ne pas confondre avec quitterMatch : un participant qui quitte un match
 * qu'il a rejoint n'a aucun motif à donner.
 */
export async function annulerMatch(input: AnnulerMatchInput): Promise<AnnulerMatchResultat> {
  const raisonAutre = input.raison === "autre" ? input.raisonAutre?.trim() : undefined;
  if (input.raison === "autre" && !raisonAutre) {
    return { ok: false, raison: "raison_autre_requise" };
  }

  const resultat = await prisma.$transaction(async (tx) => {
    // Même verrou que rejoindreMatch : sérialise deux annulations simultanées
    // pour que la seconde voie bien le statut déjà passé à "annule" plutôt
    // que de buter sur l'unicité de Annulation.matchId.
    const verrou = await tx.$queryRaw<
      { id: string; organisateurId: string; statut: string }[]
    >`
      SELECT id, "organisateurId", statut FROM "Match" WHERE id = ${input.matchId} FOR UPDATE
    `;
    const match = verrou[0];
    if (!match) return { ok: false as const, raison: "introuvable" as const };
    if (match.organisateurId !== input.userId) {
      return { ok: false as const, raison: "non_autorise" as const };
    }
    if (match.statut === "annule") {
      return { ok: false as const, raison: "deja_annule" as const };
    }

    await tx.annulation.create({
      data: {
        matchId: input.matchId,
        userId: input.userId,
        raison: input.raison,
        raisonAutre,
      },
    });

    await tx.match.update({
      where: { id: input.matchId },
      data: { statut: "annule" },
    });

    const participants = await tx.matchParticipant.findMany({
      where: { matchId: input.matchId, userId: { not: input.userId } },
      select: { userId: true },
    });

    return { ok: true as const, destinataires: participants.map((p) => p.userId) };
  });

  if (!resultat.ok) return { ok: false, raison: resultat.raison };

  // Notifications après commit et isolées une à une : l'annulation est déjà
  // écrite, un échec de notification ne doit ni la défaire ni faire échouer
  // l'appel (même pattern que envoyerMessage et envoyerDemande).
  const libelle = libelleRaisonAnnulation(input.raison, raisonAutre);
  for (const destinataireId of resultat.destinataires) {
    try {
      await creerNotification({
        userId: destinataireId,
        type: "annulation_match",
        contenu: `Le match auquel vous participez a été annulé. Motif : ${libelle}`,
        lien: `/matchs/${input.matchId}`,
      });
    } catch (err) {
      console.error(
        `[matchs] échec de la création de la notification d'annulation du match ${
          input.matchId
        } pour ${destinataireId} : ${err instanceof Error ? err.message : "erreur inconnue"}`
      );
    }
  }

  return { ok: true };
}

/**
 * Signal interne : la création de la réservation a buté sur l'index unique
 * partiel « un seul créneau confirmé par terrain/date/heure ». Un conflit
 * doit remonter par une exception, pas par un simple retour : à ce moment-là
 * Postgres a déjà avorté la transaction en cours, et toute écriture suivante
 * dans cette même transaction échouerait de toute façon.
 */
class ConflitCreneauError extends Error {
  constructor() {
    super("conflit_creneau");
    this.name = "ConflitCreneauError";
  }
}

export type DecisionReservationResultat =
  | { ok: true; reservationId: string | null }
  | {
      ok: false;
      raison:
        | "introuvable"
        | "non_autorise"
        | "annule"
        | "pas_termine"
        | "deja_decide"
        | "conflit";
    };

/**
 * Décision de réservation de fin de match : une fois le créneau passé,
 * l'organisateur — et lui seul — réserve pour de bon (une vraie Reservation
 * est créée pour son compte, sur le créneau du match) ou refuse.
 *
 * Dans les deux cas, decisionReservationAt est renseigné : c'est ce qui
 * empêche l'invite « Réserver ce créneau ? » de revenir indéfiniment après
 * un refus. Un conflit de créneau ne compte pas comme une décision — la
 * question reste posée.
 */
export async function deciderReservationMatch(
  matchId: string,
  userId: string,
  reserver: boolean,
  maintenant: Date = new Date()
): Promise<DecisionReservationResultat> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Même verrou que partout ailleurs dans ce module : sérialise deux
      // décisions simultanées, pour qu'une seule réservation soit créée.
      const verrou = await tx.$queryRaw<
        {
          id: string;
          terrainId: string;
          organisateurId: string;
          statut: string;
          date: string;
          heureDebut: string;
          heureFin: string;
          reservationId: string | null;
          decisionReservationAt: Date | null;
        }[]
      >`
        SELECT id, "terrainId", "organisateurId", statut, date, "heureDebut", "heureFin",
               "reservationId", "decisionReservationAt"
        FROM "Match" WHERE id = ${matchId} FOR UPDATE
      `;
      const match = verrou[0];
      if (!match) return { ok: false, raison: "introuvable" } as const;
      if (match.organisateurId !== userId) {
        return { ok: false, raison: "non_autorise" } as const;
      }
      if (match.statut === "annule") return { ok: false, raison: "annule" } as const;
      if (versDateLocale(match.date, match.heureFin).getTime() > maintenant.getTime()) {
        return { ok: false, raison: "pas_termine" } as const;
      }
      if (match.reservationId !== null || match.decisionReservationAt !== null) {
        return { ok: false, raison: "deja_decide" } as const;
      }

      if (!reserver) {
        await tx.match.update({
          where: { id: matchId },
          data: { decisionReservationAt: maintenant },
        });
        return { ok: true, reservationId: null } as const;
      }

      // Réutilise la logique de réservation existante — c'est elle qui porte
      // la protection contre la double réservation d'un créneau (index unique
      // partiel), inutile de la réécrire ici.
      const reservation = await creerReservation(
        {
          terrainId: match.terrainId,
          userId: match.organisateurId,
          date: match.date,
          heureDebut: match.heureDebut,
          heureFin: match.heureFin,
        },
        tx
      );
      if (!reservation.ok) throw new ConflitCreneauError();

      await tx.match.update({
        where: { id: matchId },
        data: { reservationId: reservation.id, decisionReservationAt: maintenant },
      });

      return { ok: true, reservationId: reservation.id } as const;
    });
  } catch (err) {
    if (err instanceof ConflitCreneauError) {
      return { ok: false, raison: "conflit" };
    }
    throw err;
  }
}
