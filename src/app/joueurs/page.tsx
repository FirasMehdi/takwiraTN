import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findJoueurs } from "@/lib/joueurs/queries";
import { joueurListQuerySchema } from "@/lib/validation/joueur";
import { JoueurCard } from "@/components/joueurs/JoueurCard";
import { JoueurFiltres } from "@/components/joueurs/JoueurFiltres";
import { normaliserSearchParamsRecord } from "@/lib/api/searchParams";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function JoueursPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  const params = await searchParams;
  const brut = normaliserSearchParamsRecord(params);
  const parsed = joueurListQuerySchema.safeParse(brut);
  const query = parsed.success ? parsed.data : {};
  const joueurs = await findJoueurs(query);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-4">
      <h1 className="px-4 pt-6 text-xl font-semibold text-anthracite">Joueurs</h1>

      <JoueurFiltres key={new URLSearchParams(brut).toString()} valeurs={brut} />

      {!parsed.success && (
        <p role="alert" className="mx-4 mt-4 text-sm text-red-600">
          Votre recherche contient un filtre invalide ; tous les joueurs sont affichés sans filtre.
        </p>
      )}

      <div className="flex flex-col gap-3 px-4 pt-4">
        {joueurs.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            Aucun joueur ne correspond à votre recherche.
          </p>
        ) : (
          joueurs.map((joueur) => <JoueurCard key={joueur.id} joueur={joueur} />)
        )}
      </div>
    </main>
  );
}
