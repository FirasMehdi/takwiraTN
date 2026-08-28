"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminSupprimerButton({
  url,
  confirmation,
  redirectApres,
  libelle = "Supprimer",
}: {
  url: string;
  confirmation: string;
  redirectApres: string;
  libelle?: string;
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function handleClick() {
    if (!window.confirm(confirmation)) return;

    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      router.push(redirectApres);
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={envoi}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {envoi ? "Suppression..." : libelle}
      </button>
    </div>
  );
}
