"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { TerrainStatut } from "@prisma/client";

const LIBELLES: Record<TerrainStatut, string> = {
  actif: "Actif",
  en_attente: "En attente",
  suspendu: "Suspendu",
};

export function AdminTerrainStatutForm({
  terrainId,
  statutActuel,
}: {
  terrainId: string;
  statutActuel: TerrainStatut;
}) {
  const router = useRouter();
  const [statut, setStatut] = useState<TerrainStatut>(statutActuel);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nouveauStatut = event.target.value as TerrainStatut;
    setStatut(nouveauStatut);
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/admin/terrains/${terrainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nouveauStatut }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        setStatut(statutActuel);
        return;
      }
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
      setStatut(statutActuel);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Statut du terrain"
        value={statut}
        onChange={handleChange}
        disabled={envoi}
        className="rounded-lg border border-gray-200 px-2 py-1 text-sm disabled:opacity-50"
      >
        {(Object.keys(LIBELLES) as TerrainStatut[]).map((s) => (
          <option key={s} value={s}>
            {LIBELLES[s]}
          </option>
        ))}
      </select>
      {erreur && (
        <p role="alert" className="text-xs text-red-600">
          {erreur}
        </p>
      )}
    </div>
  );
}
