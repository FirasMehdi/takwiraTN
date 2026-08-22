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
      className="block rounded-lg border border-gray-200 p-4 transition hover:border-primary"
    >
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
        <span
          className={
            terrain.creneauxLibres > 0 ? "text-sm text-primary" : "text-sm text-gray-500"
          }
        >
          {libelleCreneaux(terrain.creneauxLibres)}
        </span>
      </div>
    </Link>
  );
}
