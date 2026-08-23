"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { Slot } from "@/lib/terrains/slots";

export function CreneauxListe({
  terrainId,
  date,
  creneaux,
}: {
  terrainId: string;
  date: string;
  creneaux: Slot[];
}) {
  const router = useRouter();
  const { status } = useSession();
  const [selection, setSelection] = useState<Slot | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  function choisir(creneau: Slot) {
    if (status === "loading") return;

    if (status !== "authenticated") {
      const retour = encodeURIComponent(`/terrains/${terrainId}?date=${date}`);
      router.push(`/connexion?callbackUrl=${retour}`);
      return;
    }

    setErreur("");
    setSelection(creneau);
  }

  async function confirmer() {
    if (!selection) return;
    setEnvoi(true);

    try {
      const response = await fetch(`/api/terrains/${terrainId}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, heureDebut: selection.debut }),
      });

      if (!response.ok) {
        setErreur(
          response.status === 409
            ? "Ce créneau vient d'être réservé par quelqu'un d'autre."
            : "Une erreur est survenue. Veuillez réessayer."
        );
        router.refresh();
        return;
      }

      setSelection(null);
      setErreur("");
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  function annulerSelection() {
    setSelection(null);
    setErreur("");
  }

  if (creneaux.length === 0) {
    return (
      <p className="py-6 text-center text-gray-600">
        Aucun créneau pour cette date.
      </p>
    );
  }

  return (
    <div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {creneaux.map((creneau) => {
          const estSelectionne = selection?.debut === creneau.debut;
          return (
            <li key={creneau.debut}>
              {creneau.disponible ? (
                <button
                  type="button"
                  onClick={() => choisir(creneau)}
                  className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center transition ${
                    estSelectionne
                      ? "border-2 border-accent bg-accent/10"
                      : "border-gray-200 bg-white hover:border-primary"
                  }`}
                >
                  <span className="text-sm font-medium text-anthracite">
                    {creneau.debut} — {creneau.fin}
                  </span>
                </button>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-gray-100 bg-gray-50 px-2 py-3 text-center">
                  <span className="text-sm font-medium text-gray-400 line-through">
                    {creneau.debut} — {creneau.fin}
                  </span>
                  <span className="text-xs text-gray-500">Réservé</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {selection && (
        <div className="mt-4 rounded-lg border border-accent bg-accent/10 p-3">
          <p className="text-sm font-medium text-anthracite">
            Réserver {selection.debut} — {selection.fin} le {date} ?
          </p>
          {erreur && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {erreur}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmer}
              disabled={envoi}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
            >
              {envoi ? "Réservation..." : "Confirmer"}
            </button>
            <button
              type="button"
              onClick={annulerSelection}
              disabled={envoi}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-anthracite disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
