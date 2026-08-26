import { prisma } from "@/lib/prisma";

export type DashboardStats = {
  totalJoueurs: number;
  totalProprietaires: number;
  totalTerrains: number;
  terrainsParStatut: { actif: number; en_attente: number; suspendu: number };
  totalMatchs: number;
  matchsParStatut: { ouvert: number; complet: number; annule: number };
  maintenant: Date;
};

export async function getDashboardStats(maintenant: Date = new Date()): Promise<DashboardStats> {
  const [
    totalJoueurs,
    totalProprietaires,
    totalTerrains,
    terrainsActifs,
    terrainsEnAttente,
    terrainsSuspendus,
    totalMatchs,
    matchsOuverts,
    matchsComplets,
    matchsAnnules,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "joueur" } }),
    prisma.user.count({ where: { role: "proprietaire" } }),
    prisma.terrain.count(),
    prisma.terrain.count({ where: { statut: "actif" } }),
    prisma.terrain.count({ where: { statut: "en_attente" } }),
    prisma.terrain.count({ where: { statut: "suspendu" } }),
    prisma.match.count(),
    prisma.match.count({ where: { statut: "ouvert" } }),
    prisma.match.count({ where: { statut: "complet" } }),
    prisma.match.count({ where: { statut: "annule" } }),
  ]);

  return {
    totalJoueurs,
    totalProprietaires,
    totalTerrains,
    terrainsParStatut: {
      actif: terrainsActifs,
      en_attente: terrainsEnAttente,
      suspendu: terrainsSuspendus,
    },
    totalMatchs,
    matchsParStatut: { ouvert: matchsOuverts, complet: matchsComplets, annule: matchsAnnules },
    maintenant,
  };
}
