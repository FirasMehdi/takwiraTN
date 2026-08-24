import Link from "next/link";
import { findMatchs } from "@/lib/matchs/queries";
import { matchListQuerySchema } from "@/lib/validation/match";
import { MatchCard } from "@/components/matchs/MatchCard";
import { normaliserSearchParamsRecord } from "@/lib/api/searchParams";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function MatchsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const brut = normaliserSearchParamsRecord(params);
  const parsed = matchListQuerySchema.safeParse(brut);
  const query = parsed.success ? parsed.data : {};
  const matchs = await findMatchs(query);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-4">
      <div className="flex items-center justify-between px-4 pt-6">
        <h1 className="text-xl font-semibold text-anthracite">Matchs</h1>
        <Link
          href="/matchs/creer"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          + Créer un match
        </Link>
      </div>

      {!parsed.success && (
        <p role="alert" className="mx-4 mt-4 text-sm text-red-600">
          Votre recherche contient un filtre invalide ; tous les matchs sont affichés sans filtre.
        </p>
      )}

      <div className="flex flex-col gap-3 px-4 pt-4">
        {matchs.length === 0 ? (
          <p className="py-8 text-center text-gray-600">
            Aucun match à venir pour le moment.
          </p>
        ) : (
          matchs.map((match) => <MatchCard key={match.id} match={match} />)
        )}
      </div>
    </main>
  );
}
