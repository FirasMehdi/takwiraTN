import { prisma } from "@/lib/prisma";

export type StatsAccueil = {
  joueurs: number;
  proprietaires: number;
  terrains: number;
  matchs: number;
};

/**
 * Chiffres clés affichés sur la page d'accueil. Comptages simples,
 * volontairement sans logique métier : ce sous-projet ne fait qu'informer.
 * "terrains" ne compte que les terrains actifs (ceux réellement visibles
 * sur /terrains) ; "matchs" compte tous les matchs quel que soit leur
 * statut, y compris annulés — la stat sert à prouver l'activité de la
 * plateforme, pas la disponibilité.
 */
export async function findStatsAccueil(): Promise<StatsAccueil> {
  const [joueurs, proprietaires, terrains, matchs] = await Promise.all([
    prisma.user.count({ where: { role: "joueur" } }),
    prisma.user.count({ where: { role: "proprietaire" } }),
    prisma.terrain.count({ where: { statut: "actif" } }),
    prisma.match.count(),
  ]);

  return { joueurs, proprietaires, terrains, matchs };
}
