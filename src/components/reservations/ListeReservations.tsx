"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ReservationAnnulable } from "@/lib/reservations/queries";

function estPassee(reservation: ReservationAnnulable, maintenant: Date): boolean {
  const [annee, mois, jour] = reservation.date.split("-").map(Number);
  const [h, m] = reservation.heureDebut.split(":").map(Number);
  const debut = new Date(annee, mois - 1, jour, h, m);
  return debut.getTime() < maintenant.getTime();
}

export function ListeReservations({ reservations }: { reservations: ReservationAnnulable[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");

  if (reservations.length === 0) {
    return <p className="mt-4 text-gray-600">Vous n&apos;avez aucune réservation.</p>;
  }

  const maintenant = new Date();
  const aVenir = reservations.filter(
    (r) => r.statut === "confirmee" && !estPassee(r, maintenant)
  );
  const passees = reservations.filter(
    (r) => r.statut !== "confirmee" || estPassee(r, maintenant)
  );

  async function annuler(id: string) {
    setEnCours(id);
    setErreur("");

    try {
      const response = await fetch(`/api/reservations/${id}/annuler`, { method: "POST" });
      if (!response.ok) {
        setErreur("Impossible d'annuler cette réservation.");
        return;
      }
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-6">
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}

      <section>
        <h2 className="text-sm font-semibold text-anthracite">À venir</h2>
        <p className="mt-1 text-xs text-gray-500">
          Annulation possible jusqu&apos;à 24h avant le créneau.
        </p>
        {aVenir.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Aucune réservation à venir.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {aVenir.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-medium text-anthracite">{r.terrainNom}</p>
                  <p className="text-xs text-gray-600">
                    {r.terrainVille} · {r.date} · {r.heureDebut} — {r.heureFin}
                  </p>
                </div>
                {r.annulable ? (
                  <button
                    type="button"
                    onClick={() => annuler(r.id)}
                    disabled={enCours === r.id}
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {enCours === r.id ? "Annulation..." : "Annuler"}
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">Non annulable</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {passees.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-anthracite">Passées</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {passees.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-500">{r.terrainNom}</p>
                  <p className="text-xs text-gray-400">
                    {r.terrainVille} · {r.date} · {r.heureDebut} — {r.heureFin}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {r.statut === "annulee" ? "Annulée" : "Terminée"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
