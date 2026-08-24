import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findMatchById } from "@/lib/matchs/queries";
import { MatchActions } from "@/components/matchs/MatchActions";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = await findMatchById(id);
  if (!match) notFound();

  const session = await getServerSession(authOptions);
  const estOrganisateur = session?.user?.id === match.organisateurId;
  const estInscrit =
    !!session?.user && match.participants.some((p) => p.userId === session.user.id);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 pb-6 pt-6">
      <Link href="/matchs" className="text-sm text-primary hover:underline">
        ← Retour aux matchs
      </Link>

      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-anthracite">{match.terrainNom}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {match.terrainVille} · {match.date} · {match.heureDebut} — {match.heureFin}
        </p>
        <p className="mt-1 text-sm text-gray-600">Organisé par {match.organisateurPrenom}</p>

        {match.description && <p className="mt-3 text-sm text-anthracite">{match.description}</p>}

        <p className="mt-3 text-sm font-medium text-anthracite">
          {match.joueursInscrits} / {match.joueursMax} joueurs
        </p>

        <ul className="mt-2 flex flex-wrap gap-2">
          {match.participants.map((p) => (
            <li key={p.userId} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-anthracite">
              {p.prenom}
            </li>
          ))}
        </ul>

        <div className="mt-4">
          <MatchActions
            matchId={match.id}
            statut={match.statut}
            estOrganisateur={estOrganisateur}
            estInscrit={estInscrit}
          />
        </div>
      </div>
    </main>
  );
}
