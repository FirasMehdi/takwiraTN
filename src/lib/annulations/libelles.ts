import type { RaisonAnnulation } from "@prisma/client";

const RAISONS: Record<RaisonAnnulation, string> = {
  personnel: "Empêchement personnel",
  pas_assez_joueurs: "Pas assez de joueurs",
  conflit_horaire: "Conflit d'horaire",
  terrain_indisponible: "Terrain indisponible",
  autre: "Autre motif",
};

/**
 * Les motifs proposés dans les formulaires d'annulation, dans leur ordre
 * d'affichage — « autre » en dernier, puisqu'il demande une précision
 * supplémentaire.
 */
export const RAISONS_ANNULATION: { valeur: RaisonAnnulation; libelle: string }[] = (
  ["personnel", "pas_assez_joueurs", "conflit_horaire", "terrain_indisponible", "autre"] as const
).map((valeur) => ({ valeur, libelle: RAISONS[valeur] }));

/**
 * Texte lisible d'un motif d'annulation. Pour « autre », la précision libre
 * saisie par l'utilisateur remplace le libellé générique quand elle existe.
 */
export function libelleRaisonAnnulation(
  raison: RaisonAnnulation,
  raisonAutre?: string | null
): string {
  if (raison === "autre") {
    const precision = raisonAutre?.trim();
    return precision ? precision : RAISONS.autre;
  }
  return RAISONS[raison] ?? raison;
}
