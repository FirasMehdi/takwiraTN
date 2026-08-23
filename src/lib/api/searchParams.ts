/**
 * Normalise les search params d'une requête API en Record<string,string>,
 * en retirant les paramètres vides (une chaîne vide ne doit jamais devenir
 * une valeur de filtre valide pour zod — `?ville=` doit être traité comme
 * absent, pas comme une ville vide).
 */
export function normaliserSearchParams(
  searchParams: URLSearchParams
): Record<string, string> {
  return Object.fromEntries(
    [...searchParams.entries()].filter(([, valeur]) => valeur !== "")
  );
}

/**
 * Même normalisation, pour la forme que Next.js fournit aux Server
 * Components : `searchParams` peut contenir un tableau quand un paramètre
 * est répété dans l'URL, zod attend des chaînes simples.
 */
export function normaliserSearchParamsRecord(
  params: Record<string, string | string[] | undefined>
): Record<string, string> {
  const resultat: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(params)) {
    const premiere = Array.isArray(valeur) ? valeur[0] : valeur;
    if (premiere !== undefined && premiere !== "") {
      resultat[cle] = premiere;
    }
  }
  return resultat;
}
