import Link from "next/link";
import type { MatchResume } from "@/lib/matchs/queries";

export function MatchCard({ match }: { match: MatchResume }) {
  const placesRestantes = match.joueursMax - match.joueursInscrits;

  return (
    <Link
      href={`/matchs/${match.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-anthracite">{match.terrainNom}</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            match.statut === "complet"
              ? "bg-gray-100 text-gray-500"
              : "bg-accent text-anthracite"
          }`}
        >
          {match.statut === "complet"
            ? "Complet"
            : `${placesRestantes} place${placesRestantes > 1 ? "s" : ""}`}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        {match.terrainVille} · {match.date} · {match.heureDebut} — {match.heureFin}
      </p>
      <p className="mt-1 text-sm text-gray-600">
        {match.joueursInscrits} / {match.joueursMax} joueurs
      </p>
    </Link>
  );
}
