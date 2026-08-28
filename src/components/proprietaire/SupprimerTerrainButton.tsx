"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SupprimerTerrainButton({ terrainId }: { terrainId: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState("");
  const [envoi, setEnvoi] = useState(false);

  async function handleClick() {
    if (!window.confirm("Supprimer définitivement ce terrain ?")) return;
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/proprietaire/terrains/${terrainId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      router.push("/proprietaire/terrains");
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={envoi}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Supprimer ce terrain
      </button>
    </div>
  );
}
