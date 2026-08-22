"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type ValeursFiltres = {
  ville?: string;
  date?: string;
  heure?: string;
  format?: string;
  prixMax?: string;
};

/** Millimes (stockage/URL/API) → dinars (affichage dans le champ). */
function millimesVersDinars(millimes: string | undefined): string {
  if (!millimes) return "";
  const nombre = Number(millimes);
  if (Number.isNaN(nombre)) return "";
  return String(nombre / 1000);
}

export function TerrainFiltres({ valeurs }: { valeurs: ValeursFiltres }) {
  const router = useRouter();
  const [ville, setVille] = useState(valeurs.ville ?? "");
  const [date, setDate] = useState(valeurs.date ?? "");
  const [heure, setHeure] = useState(valeurs.heure ?? "");
  const [format, setFormat] = useState(valeurs.format ?? "");
  const [prixMaxDinars, setPrixMaxDinars] = useState(
    millimesVersDinars(valeurs.prixMax)
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    if (date) params.set("date", date);
    if (heure) params.set("heure", heure);
    if (format) params.set("format", format);

    // Le champ affiche des dinars ; l'URL et l'API attendent des millimes.
    const dinars = Number(prixMaxDinars);
    if (prixMaxDinars && !Number.isNaN(dinars)) {
      params.set("prixMax", String(Math.round(dinars * 1000)));
    }

    const query = params.toString();
    router.push(query ? `/terrains?${query}` : "/terrains");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 py-4">
      <div>
        <label htmlFor="ville" className="block text-sm font-medium">Ville</label>
        <input
          id="ville"
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          placeholder="Tunis, Sfax, Sousse..."
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="date" className="block text-sm font-medium">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="heure" className="block text-sm font-medium">Heure</label>
          <input
            id="heure"
            type="time"
            value={heure}
            onChange={(e) => setHeure(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="format" className="block text-sm font-medium">Format</label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="">Tous</option>
            <option value="cinq">5 contre 5</option>
            <option value="sept">7 contre 7</option>
            <option value="onze">11 contre 11</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="prixMax" className="block text-sm font-medium">
            Prix max (DT)
          </label>
          <input
            id="prixMax"
            type="number"
            min="0"
            value={prixMaxDinars}
            onChange={(e) => setPrixMaxDinars(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white"
      >
        Rechercher
      </button>
    </form>
  );
}
