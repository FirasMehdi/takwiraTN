"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { StatutRelation } from "@/lib/amis/queries";

export function AjouterAmiButton({
  destinataireId,
  statutInitial,
}: {
  destinataireId: string;
  statutInitial: StatutRelation;
}) {
  const router = useRouter();
  const [statut, setStatut] = useState(statutInitial);
  const [envoi, setEnvoi] = useState(false);

  async function envoyerDemande() {
    setEnvoi(true);
    try {
      const response = await fetch("/api/amis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinataireId }),
      });
      if (response.ok) {
        setStatut("demande_envoyee");
        router.refresh();
      }
    } finally {
      setEnvoi(false);
    }
  }

  if (statut === "amis") {
    return (
      <Link
        href={`/amis/${destinataireId}`}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
      >
        Discuter
      </Link>
    );
  }

  if (statut === "demande_envoyee") {
    return (
      <span className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500">
        Demande envoyée
      </span>
    );
  }

  if (statut === "demande_recue") {
    return (
      <Link
        href="/amis"
        className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
      >
        Répondre à sa demande
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={envoyerDemande}
      disabled={envoi}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
    >
      {envoi ? "Envoi..." : "Ajouter en ami"}
    </button>
  );
}
