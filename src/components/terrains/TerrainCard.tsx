import Link from "next/link";
import type { TerrainResume } from "@/lib/terrains/queries";
import { formatPrix, libelleFormat, libelleType } from "@/lib/terrains/format";

function libelleCreneaux(nombre: number): string {
  if (nombre === 0) return "Aucun créneau libre";
  if (nombre === 1) return "1 créneau libre";
  return `${nombre} créneaux libres`;
}

export function TerrainCard({ terrain }: { terrain: TerrainResume }) {
  return (
    <Link
      href={`/terrains/${terrain.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div className="relative">
        {terrain.photo ? (
          <img
            src={terrain.photo}
            alt={terrain.nom}
            className="mb-3 h-32 w-full rounded-lg object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            role="presentation"
            aria-hidden="true"
            className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-gray-100 text-3xl text-gray-400"
          >
            ⚽
          </div>
        )}
        <span
          className={`absolute right-2 top-2 rounded-full px-3 py-1 text-xs font-bold ${
            terrain.creneauxLibres > 0
              ? "bg-accent text-anthracite"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {terrain.creneauxLibres > 0 ? "⚡ " : ""}
          {libelleCreneaux(terrain.creneauxLibres)}
        </span>
      </div>

      <h2 className="font-semibold text-anthracite">{terrain.nom}</h2>

      <p className="mt-1 text-sm text-gray-600">
        {terrain.ville} · {terrain.adresse}
      </p>

      <p className="mt-1 text-sm text-gray-600">
        {libelleFormat(terrain.format)} · {libelleType(terrain.type)}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold text-primary">
          {formatPrix(terrain.prixParCreneau)}
        </span>
      </div>
    </Link>
  );
}
