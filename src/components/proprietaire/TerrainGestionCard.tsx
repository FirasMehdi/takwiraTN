import Link from "next/link";
import type { TerrainStatut, TerrainType } from "@prisma/client";
import { libelleType } from "@/lib/terrains/format";

export type TerrainGestionCardProps = {
  id: string;
  nom: string;
  ville: string;
  type: TerrainType;
  statut: TerrainStatut;
  nombreFormats: number;
  nombreHoraires: number;
};

const LIBELLES_STATUT: Record<TerrainStatut, string> = {
  actif: "Actif",
  en_attente: "En attente de validation",
  suspendu: "Suspendu",
};

const COULEURS_STATUT: Record<TerrainStatut, string> = {
  actif: "bg-accent text-anthracite",
  en_attente: "bg-gray-100 text-gray-600",
  suspendu: "bg-red-100 text-red-700",
};

export function TerrainGestionCard({ terrain }: { terrain: TerrainGestionCardProps }) {
  return (
    <Link
      href={`/proprietaire/terrains/${terrain.id}/modifier`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-anthracite">{terrain.nom}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {terrain.ville} · {libelleType(terrain.type)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${COULEURS_STATUT[terrain.statut]}`}>
          {LIBELLES_STATUT[terrain.statut]}
        </span>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        {terrain.nombreFormats} format{terrain.nombreFormats > 1 ? "s" : ""} · {terrain.nombreHoraires} plage
        {terrain.nombreHoraires > 1 ? "s" : ""} horaire{terrain.nombreHoraires > 1 ? "s" : ""}
      </p>
    </Link>
  );
}
