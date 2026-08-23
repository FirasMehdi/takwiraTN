import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import type { Metadata } from "next";
import { findTerrainById } from "@/lib/terrains/queries";
import { terrainDetailQuerySchema } from "@/lib/validation/terrain";
import { CreneauxListe } from "@/components/terrains/CreneauxListe";
import {
  formatPrix,
  libelleEquipement,
  libelleFormat,
  libelleType,
} from "@/lib/terrains/format";
import { normaliserSearchParamsRecord } from "@/lib/api/searchParams";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const getTerrain = cache((id: string, date?: string) => findTerrainById(id, date));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const terrain = await getTerrain(id);
  if (!terrain) return { title: "Terrain introuvable" };
  return {
    title: `${terrain.nom} — ${terrain.ville}`,
    description: `${libelleFormat(terrain.format)} à ${terrain.ville}. ${formatPrix(terrain.prixParCreneau)} le créneau.`,
  };
}

export default async function TerrainDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;

  const brut = normaliserSearchParamsRecord(query);
  const parsed = terrainDetailQuerySchema.safeParse(brut);

  const terrain = await getTerrain(id, parsed.success ? parsed.data.date : undefined);
  if (!terrain) notFound();

  return (
    <main className="px-4 pb-6 pt-6">
      <Link href="/terrains" className="text-sm text-primary">
        ← Retour aux terrains
      </Link>

      {terrain.photos[0] ? (
        <img
          src={terrain.photos[0]}
          alt={terrain.nom}
          className="mt-3 h-40 w-full rounded object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          role="presentation"
          aria-hidden="true"
          className="mt-3 flex h-40 w-full items-center justify-center rounded bg-gray-100 text-4xl text-gray-400"
        >
          ⚽
        </div>
      )}

      <h1 className="mt-3 text-xl font-semibold">{terrain.nom}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {terrain.adresse}, {terrain.ville}
      </p>

      {terrain.description && (
        <p className="mt-3 text-sm">{terrain.description}</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-gray-600">Format</dt>
          <dd className="font-medium">{libelleFormat(terrain.format)}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Surface</dt>
          <dd className="font-medium">{libelleType(terrain.type)}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Tarif</dt>
          <dd className="font-medium text-primary">
            {formatPrix(terrain.prixParCreneau)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-600">Durée</dt>
          <dd className="font-medium">{terrain.dureeCreneauMinutes} minutes</dd>
        </div>
      </dl>

      {terrain.equipements.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold">Équipements</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {terrain.equipements.map((equipement) => (
              <li
                key={equipement}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs"
              >
                {libelleEquipement(equipement)}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Créneaux</h2>

        {brut.date && !parsed.success && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            Date invalide ; les créneaux d&apos;aujourd&apos;hui sont affichés.
          </p>
        )}

        <form method="get" className="mt-2 flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="date" className="block text-xs text-gray-600">
              Choisir une date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={terrain.date}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Afficher
          </button>
        </form>

        <div className="mt-3">
          <CreneauxListe creneaux={terrain.creneaux} />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          La réservation en ligne arrive bientôt.
        </p>
      </section>
    </main>
  );
}
