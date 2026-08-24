import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { JoueurListQuery } from "@/lib/validation/joueur";

export type JoueurResume = {
  id: string;
  prenom: string;
  ville: string;
  poste: string | null;
  niveau: string | null;
  photoUrl: string | null;
};

export type JoueurDetail = JoueurResume & {
  piedPrefere: string | null;
  bio: string | null;
};

/**
 * Le numéro de téléphone n'est jamais renvoyé ici, volontairement : c'est
 * une donnée privée, visible uniquement par son propriétaire via /profil.
 */
export async function findJoueurs(query: JoueurListQuery): Promise<JoueurResume[]> {
  const where: Prisma.PlayerProfileWhereInput = { user: { role: "joueur" } };

  if (query.ville) {
    where.ville = { equals: query.ville, mode: "insensitive" };
  }
  if (query.poste) {
    where.poste = query.poste;
  }

  const profils = await prisma.playerProfile.findMany({
    where,
    orderBy: { prenom: "asc" },
    take: 100,
  });

  return profils.map((p) => ({
    id: p.userId,
    prenom: p.prenom,
    ville: p.ville,
    poste: p.poste,
    niveau: p.niveau,
    photoUrl: p.photoUrl,
  }));
}

export async function findJoueurById(userId: string): Promise<JoueurDetail | null> {
  const profil = await prisma.playerProfile.findFirst({
    where: { userId, user: { role: "joueur" } },
  });
  if (!profil) return null;

  return {
    id: profil.userId,
    prenom: profil.prenom,
    ville: profil.ville,
    poste: profil.poste,
    niveau: profil.niveau,
    photoUrl: profil.photoUrl,
    piedPrefere: profil.piedPrefere,
    bio: profil.bio,
  };
}
