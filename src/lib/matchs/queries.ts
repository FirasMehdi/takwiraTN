import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MatchResume = {
  id: string;
  terrainId: string;
  terrainNom: string;
  terrainVille: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  joueursMax: number;
  joueursInscrits: number;
  statut: "ouvert" | "complet" | "annule";
};

export type MatchDetail = MatchResume & {
  description: string | null;
  organisateurId: string;
  organisateurPrenom: string;
  participants: { userId: string; prenom: string }[];
};

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
    joueursMax: m.joueursMax,
    joueursInscrits: m._count.participants,
    statut: m.statut,
  }));
}

export async function findMatchById(id: string): Promise<MatchDetail | null> {
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

  return {
    id: m.id,
    terrainId: m.terrainId,
    terrainNom: m.terrain.nom,
    terrainVille: m.terrain.ville,
    date: m.date,
    heureDebut: m.heureDebut,
    heureFin: m.heureFin,
    joueursMax: m.joueursMax,
    joueursInscrits: m.participants.length,
    statut: m.statut,
    description: m.description,
    organisateurId: m.organisateurId,
    organisateurPrenom: m.organisateur.profile?.prenom ?? "Organisateur",
    participants: m.participants.map((p) => ({
      userId: p.userId,
      prenom: p.user.profile?.prenom ?? "Joueur",
    })),
  };
}

export type CreerMatchInput = {
  terrainId: string;
  organisateurId: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  joueursMax: number;
  description?: string;
};

export async function creerMatch(input: CreerMatchInput): Promise<{ id: string }> {
  const match = await prisma.$transaction(async (tx) => {
    const created = await tx.match.create({
      data: {
        terrainId: input.terrainId,
        organisateurId: input.organisateurId,
        date: input.date,
        heureDebut: input.heureDebut,
        heureFin: input.heureFin,
        joueursMax: input.joueursMax,
        description: input.description,
      },
    });
    await tx.matchParticipant.create({
      data: { matchId: created.id, userId: input.organisateurId },
    });
    return created;
  });

  return { id: match.id };
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
    // c'est pourquoi le mécanisme diffère ici.
    const verrou = await tx.$queryRaw<{ id: string; statut: string; joueursMax: number }[]>`
      SELECT id, statut, "joueursMax" FROM "Match" WHERE id = ${matchId} FOR UPDATE
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

    // Un départ rouvre un match complet.
    await tx.match.updateMany({
      where: { id: matchId, statut: "complet" },
      data: { statut: "ouvert" },
    });

    return { ok: true } as const;
  });
}

export type AnnulerMatchResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "non_autorise" };

export async function annulerMatch(
  matchId: string,
  userId: string
): Promise<AnnulerMatchResultat> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { ok: false, raison: "introuvable" };
  if (match.organisateurId !== userId) return { ok: false, raison: "non_autorise" };

  await prisma.match.update({ where: { id: matchId }, data: { statut: "annule" } });
  return { ok: true };
}
