import { prisma } from "@/lib/prisma";
import type { RaisonAnnulation } from "@prisma/client";

export type AdminMatchResume = {
  id: string;
  terrainNom: string;
  terrainVille: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  joueursMax: number;
  joueursInscrits: number;
  statut: "ouvert" | "complet" | "annule";
  organisateurEmail: string;
};

export async function findAdminMatchs(): Promise<AdminMatchResume[]> {
  const matchs = await prisma.match.findMany({
    include: {
      terrain: { select: { nom: true, ville: true } },
      organisateur: { select: { email: true } },
      _count: { select: { participants: true } },
    },
    orderBy: [{ date: "desc" }, { heureDebut: "desc" }],
    take: 300,
  });

  return matchs.map((m) => ({
    id: m.id,
    terrainNom: m.terrain.nom,
    terrainVille: m.terrain.ville,
    date: m.date,
    heureDebut: m.heureDebut,
    heureFin: m.heureFin,
    joueursMax: m.joueursMax,
    joueursInscrits: m._count.participants,
    statut: m.statut,
    organisateurEmail: m.organisateur.email,
  }));
}

export type AnnulerMatchAdminInput = {
  matchId: string;
  adminId: string;
  raison: RaisonAnnulation;
  raisonAutre?: string | null;
};

export type AnnulerMatchAdminResultat =
  | { ok: true }
  | { ok: false; raison: "introuvable" | "deja_annule" };

export async function annulerMatchAdmin(
  input: AnnulerMatchAdminInput
): Promise<AnnulerMatchAdminResultat> {
  const match = await prisma.match.findUnique({ where: { id: input.matchId } });
  if (!match) return { ok: false, raison: "introuvable" };
  if (match.statut === "annule") return { ok: false, raison: "deja_annule" };

  await prisma.$transaction([
    prisma.annulation.create({
      data: {
        matchId: input.matchId,
        userId: input.adminId,
        raison: input.raison,
        raisonAutre: input.raison === "autre" ? (input.raisonAutre ?? null) : null,
      },
    }),
    prisma.match.update({ where: { id: input.matchId }, data: { statut: "annule" } }),
  ]);

  return { ok: true };
}
