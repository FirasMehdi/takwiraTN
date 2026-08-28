"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type HoraireLigne = { jourSemaine: number; ouvre: string; ferme: string };

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function ligneVide(): HoraireLigne {
  return { jourSemaine: 1, ouvre: "08:00", ferme: "22:00" };
}

export function HorairesManager({
  terrainId,
  horaires: horairesInitiaux,
}: {
  terrainId: string;
  horaires: HoraireLigne[];
}) {
  const router = useRouter();
  const [horaires, setHoraires] = useState<HoraireLigne[]>(
    horairesInitiaux.length > 0 ? horairesInitiaux : [ligneVide()]
  );
  const [erreur, setErreur] = useState("");
  const [succes, setSucces] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  function majLigne(index: number, champ: keyof HoraireLigne, valeur: string | number) {
    setHoraires((prev) => prev.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne)));
  }

  async function enregistrer() {
    setEnvoi(true);
    setErreur("");
    setSucces(false);
    try {
      const response = await fetch(`/api/proprietaire/terrains/${terrainId}/horaires`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horaires }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      setSucces(true);
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}
      {succes && <p className="text-sm text-green-700">Horaires enregistrés.</p>}

      <div className="flex flex-col gap-2">
        {horaires.map((ligne, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-2">
            <div>
              <label htmlFor={`h-jour-${index}`} className="block text-xs text-gray-600">Jour</label>
              <select
                id={`h-jour-${index}`}
                value={ligne.jourSemaine}
                onChange={(e) => majLigne(index, "jourSemaine", Number(e.target.value))}
                className={champClasse}
              >
                {JOURS.map((jour, i) => (
                  <option key={jour} value={i}>{jour}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`h-ouvre-${index}`} className="block text-xs text-gray-600">Ouverture</label>
              <input
                id={`h-ouvre-${index}`}
                type="time"
                value={ligne.ouvre}
                onChange={(e) => majLigne(index, "ouvre", e.target.value)}
                className={champClasse}
              />
            </div>
            <div>
              <label htmlFor={`h-ferme-${index}`} className="block text-xs text-gray-600">Fermeture</label>
              <input
                id={`h-ferme-${index}`}
                type="time"
                value={ligne.ferme}
                onChange={(e) => majLigne(index, "ferme", e.target.value)}
                className={champClasse}
              />
            </div>
            {horaires.length > 1 && (
              <button
                type="button"
                onClick={() => setHoraires((prev) => prev.filter((_, i) => i !== index))}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Retirer
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setHoraires((prev) => [...prev, ligneVide()])}
          className="text-sm font-semibold text-primary hover:underline"
        >
          + Ajouter un horaire
        </button>
        <button
          type="button"
          onClick={enregistrer}
          disabled={envoi}
          className="ml-auto rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {envoi ? "Enregistrement..." : "Enregistrer les horaires"}
        </button>
      </div>
    </div>
  );
}
