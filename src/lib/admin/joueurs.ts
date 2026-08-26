import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProfilInput } from "@/lib/validation/profil";

export type AdminJoueurResume = {
  id: string;
  email: string;
  prenom: string;
  ville: string;
  poste: string | null;
  niveau: string | null;
  createdAt: Date;
};

export type AdminJoueurDetail = AdminJoueurResume & {
  piedPrefere: string | null;
  telephone: string | null;
  bio: string | null;
  photoUrl: string | null;
};

export async function findAdminJoueurs(q?: string): Promise<AdminJoueurResume[]> {
  const where: Prisma.UserWhereInput = { role: "joueur" };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { profile: { prenom: { contains: q, mode: "insensitive" } } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    include: { profile: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return users
    .filter((u) => u.profile !== null)
    .map((u) => ({
      id: u.id,
      email: u.email,
      prenom: u.profile!.prenom,
      ville: u.profile!.ville,
      poste: u.profile!.poste,
      niveau: u.profile!.niveau,
      createdAt: u.createdAt,
    }));
}

export async function findAdminJoueurById(id: string): Promise<AdminJoueurDetail | null> {
  const user = await prisma.user.findFirst({
    where: { id, role: "joueur" },
    include: { profile: true },
  });
  if (!user?.profile) return null;

  return {
    id: user.id,
    email: user.email,
    prenom: user.profile.prenom,
    ville: user.profile.ville,
    poste: user.profile.poste,
    niveau: user.profile.niveau,
    piedPrefere: user.profile.piedPrefere,
    telephone: user.profile.telephone,
    bio: user.profile.bio,
    photoUrl: user.profile.photoUrl,
    createdAt: user.createdAt,
  };
}

export type UpdateAdminJoueurResultat = { ok: true } | { ok: false; raison: "introuvable" };

export async function updateAdminJoueur(
  id: string,
  data: ProfilInput
): Promise<UpdateAdminJoueurResultat> {
  const user = await prisma.user.findFirst({ where: { id, role: "joueur" } });
  if (!user) return { ok: false, raison: "introuvable" };

  await prisma.playerProfile.update({ where: { userId: id }, data });
  return { ok: true };
}

export type DeleteAdminJoueurResultat = { ok: true } | { ok: false; raison: "introuvable" };

export async function deleteAdminJoueur(id: string): Promise<DeleteAdminJoueurResultat> {
  const user = await prisma.user.findFirst({ where: { id, role: "joueur" } });
  if (!user) return { ok: false, raison: "introuvable" };

  await prisma.user.delete({ where: { id } });
  return { ok: true };
}
