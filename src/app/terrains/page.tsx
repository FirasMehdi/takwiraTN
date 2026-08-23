import { findTerrains } from "@/lib/terrains/queries";
import { terrainListQuerySchema } from "@/lib/validation/terrain";
import { TerrainCard } from "@/components/terrains/TerrainCard";
import { TerrainFiltres } from "@/components/terrains/TerrainFiltres";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TerrainsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  // Normalise en Record<string, string> : Next peut fournir un tableau quand
  // le même paramètre apparaît plusieurs fois, et zod attend des chaînes.
  const brut: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(params)) {
    const premiere = Array.isArray(valeur) ? valeur[0] : valeur;
    if (premiere !== undefined && premiere !== "") {
      brut[cle] = premiere;
    }
  }

  const parsed = terrainListQuerySchema.safeParse(brut);
  const query = parsed.success ? parsed.data : {};
  const terrains = await findTerrains(query);

  return (
    <main className="pb-4">
      <h1 className="px-4 pt-6 text-xl font-semibold">Terrains</h1>

      <TerrainFiltres key={new URLSearchParams(brut).toString()} valeurs={brut} />

      {!parsed.success && (
        <p role="alert" className="px-4 text-sm text-red-600">
          Certains filtres sont invalides et ont été ignorés.
        </p>
      )}

      <div className="flex flex-col gap-3 px-4">
        {terrains.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            Aucun terrain ne correspond à votre recherche.
          </p>
        ) : (
          terrains.map((terrain) => (
            <TerrainCard key={terrain.id} terrain={terrain} />
          ))
        )}
      </div>
    </main>
  );
}
