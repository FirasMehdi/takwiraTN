import type { Slot } from "@/lib/terrains/slots";

export function CreneauxListe({ creneaux }: { creneaux: Slot[] }) {
  if (creneaux.length === 0) {
    return (
      <p className="py-6 text-center text-gray-600">
        Aucun créneau pour cette date.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {creneaux.map((creneau) => (
        <li
          key={creneau.debut}
          className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
        >
          <span className="font-medium">
            {creneau.debut} — {creneau.fin}
          </span>

          {creneau.disponible ? (
            <button
              type="button"
              disabled
              title="Réservation bientôt disponible"
              className="rounded bg-primary px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
            >
              Réserver
            </button>
          ) : (
            <span className="text-sm text-gray-500">Réservé</span>
          )}
        </li>
      ))}
    </ul>
  );
}
