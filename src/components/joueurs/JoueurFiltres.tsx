"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type ValeursFiltresJoueurs = {
  ville?: string;
  poste?: string;
};

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function JoueurFiltres({ valeurs }: { valeurs: ValeursFiltresJoueurs }) {
  const router = useRouter();
  const [ville, setVille] = useState(valeurs.ville ?? "");
  const [poste, setPoste] = useState(valeurs.poste ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (ville) params.set("ville", ville);
    if (poste) params.set("poste", poste);
    const query = params.toString();
    router.push(query ? `/joueurs?${query}` : "/joueurs");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-4 mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="ville" className="block text-sm font-medium text-anthracite">Ville</label>
          <input
            id="ville"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Tunis, Sfax, Sousse..."
            className={champClasse}
          />
        </div>
        <div className="flex-1">
          <label htmlFor="poste" className="block text-sm font-medium text-anthracite">Poste</label>
          <select
            id="poste"
            value={poste}
            onChange={(e) => setPoste(e.target.value)}
            className={champClasse}
          >
            <option value="">Tous</option>
            <option value="gardien">Gardien</option>
            <option value="defenseur">Défenseur</option>
            <option value="milieu">Milieu</option>
            <option value="attaquant">Attaquant</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark"
      >
        Rechercher
      </button>
    </form>
  );
}
