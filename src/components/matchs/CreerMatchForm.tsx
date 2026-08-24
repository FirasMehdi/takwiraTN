"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Terrain = { id: string; nom: string; ville: string };

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function CreerMatchForm({ terrains }: { terrains: Terrain[] }) {
  const router = useRouter();
  const [terrainId, setTerrainId] = useState(terrains[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [joueursMax, setJoueursMax] = useState("10");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setError("");

    try {
      const response = await fetch("/api/matchs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terrainId,
          date,
          heureDebut,
          heureFin,
          joueursMax: Number(joueursMax),
          description: description || undefined,
        }),
      });

      if (!response.ok) {
        try {
          const body = await response.json();
          setErrors(body.error ?? {});
        } catch {
          setError("Une erreur est survenue. Veuillez réessayer.");
        }
        return;
      }

      const body = await response.json();
      router.push(`/matchs/${body.id}`);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="terrainId" className="block text-sm font-medium text-anthracite">Terrain</label>
        <select
          id="terrainId"
          value={terrainId}
          onChange={(e) => setTerrainId(e.target.value)}
          className={champClasse}
          required
        >
          {terrains.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nom} — {t.ville}
            </option>
          ))}
        </select>
        {errors.terrainId && <p className="mt-1 text-sm text-red-600">{errors.terrainId[0]}</p>}
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="date" className="block text-sm font-medium text-anthracite">Date</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={champClasse}
            required
          />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date[0]}</p>}
        </div>
        <div className="flex-1">
          <label htmlFor="joueursMax" className="block text-sm font-medium text-anthracite">Joueurs recherchés</label>
          <input
            id="joueursMax"
            type="number"
            min={2}
            max={30}
            value={joueursMax}
            onChange={(e) => setJoueursMax(e.target.value)}
            className={champClasse}
            required
          />
          {errors.joueursMax && <p className="mt-1 text-sm text-red-600">{errors.joueursMax[0]}</p>}
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="heureDebut" className="block text-sm font-medium text-anthracite">Heure de début</label>
          <input
            id="heureDebut"
            type="time"
            value={heureDebut}
            onChange={(e) => setHeureDebut(e.target.value)}
            className={champClasse}
            required
          />
          {errors.heureDebut && <p className="mt-1 text-sm text-red-600">{errors.heureDebut[0]}</p>}
        </div>
        <div className="flex-1">
          <label htmlFor="heureFin" className="block text-sm font-medium text-anthracite">Heure de fin</label>
          <input
            id="heureFin"
            type="time"
            value={heureFin}
            onChange={(e) => setHeureFin(e.target.value)}
            className={champClasse}
            required
          />
          {errors.heureFin && <p className="mt-1 text-sm text-red-600">{errors.heureFin[0]}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-anthracite">Description (optionnel)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={champClasse}
          rows={3}
          maxLength={500}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description[0]}</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || terrains.length === 0}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
      >
        {submitting ? "Création..." : "Créer le match"}
      </button>
    </form>
  );
}
