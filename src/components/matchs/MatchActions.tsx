"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export function MatchActions({
  matchId,
  statut,
  estOrganisateur,
  estInscrit,
}: {
  matchId: string;
  statut: "ouvert" | "complet" | "annule";
  estOrganisateur: boolean;
  estInscrit: boolean;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function appeler(url: string) {
    if (status !== "authenticated") {
      router.push(`/connexion?callbackUrl=${encodeURIComponent(`/matchs/${matchId}`)}`);
      return;
    }
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(url, { method: "POST" });
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

  if (statut === "annule") {
    return <p className="text-sm text-gray-500">Ce match a été annulé.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}
      <div className="flex gap-2">
        {estInscrit ? (
          <button
            type="button"
            onClick={() => appeler(`/api/matchs/${matchId}/quitter`)}
            disabled={envoi}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Quitter le match
          </button>
        ) : (
          <button
            type="button"
            onClick={() => appeler(`/api/matchs/${matchId}/rejoindre`)}
            disabled={envoi || statut === "complet"}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
          >
            {statut === "complet" ? "Match complet" : "Rejoindre le match"}
          </button>
        )}
        {estOrganisateur && (
          <button
            type="button"
            onClick={() => appeler(`/api/matchs/${matchId}/annuler`)}
            disabled={envoi}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-anthracite disabled:opacity-50"
          >
            Annuler le match
          </button>
        )}
      </div>
    </div>
  );
}
