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
import { TerrainIllustration } from "@/components/ui/TerrainIllustration";

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
  const formats = terrain.formats.map((f) => libelleFormat(f.format)).join(", ");
  const prixMin = Math.min(...terrain.formats.map((f) => f.prixParCreneau));
  return {
    title: `${terrain.nom} — ${terrain.ville}`,
    description: `${formats} à ${terrain.ville}. À partir de ${formatPrix(prixMin)} le créneau.`,
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
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 pb-6 pt-6">
      <Link href="/terrains" className="text-sm text-primary hover:underline">
        ← Retour aux terrains
      </Link>

      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {terrain.photos[0] ? (
          <img
            src={terrain.photos[0]}
            alt={terrain.nom}
            className="h-40 w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <TerrainIllustration className="h-40 w-full object-cover" />
        )}

        <div className="p-4">
          <h1 className="text-xl font-semibold text-anthracite">{terrain.nom}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {terrain.adresse}, {terrain.ville}
          </p>

          {terrain.description && (
            <p className="mt-3 text-sm text-anthracite">{terrain.description}</p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-600">Surface</dt>
              <dd className="font-medium text-anthracite">{libelleType(terrain.type)}</dd>
            </div>
            <div>
              <dt className="text-gray-600">Durée</dt>
              <dd className="font-medium text-anthracite">{terrain.dureeCreneauMinutes} minutes</dd>
            </div>
          </dl>

          <section className="mt-4">
            <h2 className="text-sm font-semibold text-anthracite">Formats disponibles</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {terrain.formats.map((f) => (
                <li
                  key={f.format}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <span className="text-anthracite">
                    {libelleFormat(f.format)} · {f.capacite} joueurs max
                  </span>
                  <span className="font-semibold text-primary">{formatPrix(f.prixParCreneau)}</span>
                </li>
              ))}
            </ul>
          </section>

          {terrain.equipements.length > 0 && (
            <section className="mt-4">
              <h2 className="text-sm font-semibold text-anthracite">Équipements</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {terrain.equipements.map((equipement) => (
                  <li
                    key={equipement}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-anthracite"
                  >
                    {libelleEquipement(equipement)}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-anthracite">Créneaux</h2>

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
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            Afficher
          </button>
        </form>

        <div className="mt-3">
          <CreneauxListe terrainId={terrain.id} date={terrain.date} creneaux={terrain.creneaux} />
        </div>
      </section>
    </main>
  );
}
