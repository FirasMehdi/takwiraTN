"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrix, libelleFormat } from "@/lib/terrains/format";
import type { FormatEquipe } from "@prisma/client";

export type FormatLigne = {
  id: string;
  format: FormatEquipe;
  capacite: number;
  prixParCreneau: number;
};

const FORMATS_DISPONIBLES: FormatEquipe[] = ["quatre", "cinq", "six", "sept", "huit", "neuf", "onze"];

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function FormatsManager({ terrainId, formats }: { terrainId: string; formats: FormatLigne[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCapacite, setEditCapacite] = useState("");
  const [editPrixDinars, setEditPrixDinars] = useState("");

  // Find first format not in existing formats, or default to "quatre"
  const formatsInUse = new Set(formats.map(f => f.format));
  const defaultFormat = FORMATS_DISPONIBLES.find(f => !formatsInUse.has(f)) ?? "quatre";

  const [nouveauFormat, setNouveauFormat] = useState<FormatEquipe>(defaultFormat);
  const [nouvelleCapacite, setNouvelleCapacite] = useState("");
  const [nouveauPrixDinars, setNouveauPrixDinars] = useState("");
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  function commencerEdition(ligne: FormatLigne) {
    setEditingId(ligne.id);
    setEditCapacite(String(ligne.capacite));
    setEditPrixDinars(String(ligne.prixParCreneau / 1000));
    setErreur("");
  }

  async function enregistrerEdition(formatId: string) {
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/proprietaire/terrains/${terrainId}/formats/${formatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capacite: Number(editCapacite),
          prixParCreneau: Math.round(Number(editPrixDinars) * 1000),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer(formatId: string) {
    if (!window.confirm("Retirer ce format ?")) return;
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/proprietaire/terrains/${terrainId}/formats/${formatId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  async function ajouter() {
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/proprietaire/terrains/${terrainId}/formats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: nouveauFormat,
          capacite: Number(nouvelleCapacite),
          prixParCreneau: Math.round(Number(nouveauPrixDinars) * 1000),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      setNouvelleCapacite("");
      setNouveauPrixDinars("");
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

      <ul className="flex flex-col gap-2">
        {formats.map((ligne) => (
          <li key={ligne.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-2">
            {editingId === ligne.id ? (
              <>
                <div>
                  <label htmlFor={`edit-capacite-${ligne.id}`} className="block text-xs text-gray-600">Capacité</label>
                  <input
                    id={`edit-capacite-${ligne.id}`}
                    type="number"
                    min={2}
                    max={30}
                    value={editCapacite}
                    onChange={(e) => setEditCapacite(e.target.value)}
                    className={champClasse}
                  />
                </div>
                <div>
                  <label htmlFor={`edit-prix-${ligne.id}`} className="block text-xs text-gray-600">Prix / créneau (DT)</label>
                  <input
                    id={`edit-prix-${ligne.id}`}
                    type="number"
                    min={0}
                    step="0.001"
                    value={editPrixDinars}
                    onChange={(e) => setEditPrixDinars(e.target.value)}
                    className={champClasse}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => enregistrerEdition(ligne.id)}
                  disabled={envoi}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-anthracite"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-anthracite">
                  {libelleFormat(ligne.format)} · {ligne.capacite} joueurs max · {formatPrix(ligne.prixParCreneau)}
                </span>
                <button
                  type="button"
                  onClick={() => commencerEdition(ligne)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-anthracite"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => supprimer(ligne.id)}
                  disabled={envoi}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Retirer
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {formatsInUse.size < FORMATS_DISPONIBLES.length ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-2">
          <div>
            <label htmlFor="nouveau-format" className="block text-xs text-gray-600">Format</label>
            <select
              id="nouveau-format"
              value={nouveauFormat}
              onChange={(e) => setNouveauFormat(e.target.value as FormatEquipe)}
              className={champClasse}
            >
              {FORMATS_DISPONIBLES.filter(f => !formats.some(fmt => fmt.format === f)).map((f) => (
                <option key={f} value={f}>{libelleFormat(f)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nouvelle-capacite" className="block text-xs text-gray-600">Capacité</label>
            <input
              id="nouvelle-capacite"
              type="number"
              min={2}
              max={30}
              value={nouvelleCapacite}
              onChange={(e) => setNouvelleCapacite(e.target.value)}
              className={champClasse}
            />
          </div>
          <div>
            <label htmlFor="nouveau-prix" className="block text-xs text-gray-600">Prix / créneau (DT)</label>
            <input
              id="nouveau-prix"
              type="number"
              min={0}
              step="0.001"
              value={nouveauPrixDinars}
              onChange={(e) => setNouveauPrixDinars(e.target.value)}
              className={champClasse}
            />
          </div>
          <button
            type="button"
            onClick={ajouter}
            disabled={envoi || !nouvelleCapacite || !nouveauPrixDinars}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-600">Tous les formats disponibles sont déjà configurés pour ce terrain.</p>
      )}
    </div>
  );
}
