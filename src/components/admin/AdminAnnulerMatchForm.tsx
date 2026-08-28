"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const RAISONS = [
  { value: "personnel", label: "Personnel" },
  { value: "pas_assez_joueurs", label: "Pas assez de joueurs" },
  { value: "conflit_horaire", label: "Conflit d'horaire" },
  { value: "terrain_indisponible", label: "Terrain indisponible" },
  { value: "autre", label: "Autre" },
] as const;

type Raison = (typeof RAISONS)[number]["value"];

export function AdminAnnulerMatchForm({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [raison, setRaison] = useState<Raison>("personnel");
  const [raisonAutre, setRaisonAutre] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/admin/matchs/${matchId}/annuler`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raison,
          raisonAutre: raison === "autre" ? raisonAutre : null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      setOuvert(false);
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-600 hover:bg-red-50"
      >
        Annuler le match
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3">
      <label htmlFor={`raison-${matchId}`} className="text-sm font-medium text-anthracite">
        Motif de l&apos;annulation
      </label>
      <select
        id={`raison-${matchId}`}
        value={raison}
        onChange={(e) => setRaison(e.target.value as Raison)}
        className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
      >
        {RAISONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {raison === "autre" && (
        <>
          <label htmlFor={`raison-autre-${matchId}`} className="text-sm font-medium text-anthracite">
            Précisez
          </label>
          <textarea
            id={`raison-autre-${matchId}`}
            value={raisonAutre}
            onChange={(e) => setRaisonAutre(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1 text-sm"
            rows={2}
            maxLength={300}
          />
        </>
      )}
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={envoi}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {envoi ? "Annulation..." : "Confirmer l'annulation"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-anthracite"
        >
          Fermer
        </button>
      </div>
    </form>
  );
}
