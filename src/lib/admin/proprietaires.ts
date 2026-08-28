import { prisma } from "@/lib/prisma";
import type { TerrainStatut } from "@prisma/client";

export type AdminProprietaireResume = {
  id: string;
  email: string;
  createdAt: Date;
  nombreTerrains: number;
};

export type AdminProprietaireTerrain = {
  id: string;
  nom: string;
  ville: string;
  statut: TerrainStatut;
};

export type AdminProprietaireDetail = AdminProprietaireResume & {
  terrains: AdminProprietaireTerrain[];
};

export async function findAdminProprietaires(q?: string): Promise<AdminProprietaireResume[]> {
  const users = await prisma.user.findMany({
    where: {
      role: "proprietaire",
      ...(q ? { email: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { _count: { select: { terrains: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    createdAt: u.createdAt,
    nombreTerrains: u._count.terrains,
  }));
}

export async function findAdminProprietaireById(id: string): Promise<AdminProprietaireDetail | null> {
  const user = await prisma.user.findFirst({
    where: { id, role: "proprietaire" },
    include: { terrains: { orderBy: { nom: "asc" } } },
  });
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    nombreTerrains: user.terrains.length,
    terrains: user.terrains.map((t) => ({
      id: t.id,
      nom: t.nom,
      ville: t.ville,
      statut: t.statut,
    })),
  };
}

export type DeleteAdminProprietaireResultat = { ok: true } | { ok: false; raison: "introuvable" };

export async function deleteAdminProprietaire(id: string): Promise<DeleteAdminProprietaireResultat> {
  const user = await prisma.user.findFirst({ where: { id, role: "proprietaire" } });
  if (!user) return { ok: false, raison: "introuvable" };

  await prisma.user.delete({ where: { id } });
  return { ok: true };
}
