"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Invite de fin de match, réservée à l'organisateur : le créneau est passé,
 * veut-il en faire une vraie réservation ? Les deux réponses sont
 * enregistrées côté serveur — un refus explicite fait disparaître l'invite
 * pour de bon.
 */
export function DecisionReservationMatch({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function decider(reserver: boolean) {
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/matchs/${matchId}/reservation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reserver }),
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

  return (
    <div className="rounded-lg border border-accent bg-white p-3">
      <p className="text-sm font-semibold text-anthracite">Réserver ce créneau ?</p>
      <p className="mt-1 text-sm text-gray-600">
        Ce match est terminé. Confirmez la réservation du créneau auprès du terrain, ou passez
        votre tour — la question ne vous sera plus posée.
      </p>
      {erreur && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {erreur}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => decider(true)}
          disabled={envoi}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
        >
          Réserver le créneau
        </button>
        <button
          type="button"
          onClick={() => decider(false)}
          disabled={envoi}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-anthracite disabled:opacity-50"
        >
          Non merci
        </button>
      </div>
    </div>
  );
}
