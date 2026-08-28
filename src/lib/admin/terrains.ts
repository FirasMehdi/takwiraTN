import { prisma } from "@/lib/prisma";
import type { TerrainStatut, TerrainType } from "@prisma/client";

export type AdminTerrainResume = {
  id: string;
  nom: string;
  ville: string;
  type: TerrainType;
  statut: TerrainStatut;
  ownerId: string | null;
  ownerEmail: string | null;
  createdAt: Date;
};

export async function findAdminTerrains(): Promise<AdminTerrainResume[]> {
  const terrains = await prisma.terrain.findMany({
    include: { owner: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return terrains.map((t) => ({
    id: t.id,
    nom: t.nom,
    ville: t.ville,
    type: t.type,
    statut: t.statut,
    ownerId: t.ownerId,
    ownerEmail: t.owner?.email ?? null,
    createdAt: t.createdAt,
  }));
}

export type UpdateAdminTerrainStatutResultat = { ok: true } | { ok: false; raison: "introuvable" };

export async function updateAdminTerrainStatut(
  id: string,
  statut: TerrainStatut
): Promise<UpdateAdminTerrainStatutResultat> {
  const terrain = await prisma.terrain.findUnique({ where: { id } });
  if (!terrain) return { ok: false, raison: "introuvable" };

  await prisma.terrain.update({ where: { id }, data: { statut } });
  return { ok: true };
}

export type DeleteAdminTerrainResultat = { ok: true } | { ok: false; raison: "introuvable" };

export async function deleteAdminTerrain(id: string): Promise<DeleteAdminTerrainResultat> {
  const terrain = await prisma.terrain.findUnique({ where: { id } });
  if (!terrain) return { ok: false, raison: "introuvable" };

  await prisma.terrain.delete({ where: { id } });
  return { ok: true };
}
