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
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {creneaux.map((creneau) => (
        <li
          key={creneau.debut}
          className={`flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center ${
            creneau.disponible
              ? "border-gray-200 bg-white"
              : "border-gray-100 bg-gray-50"
          }`}
        >
          <span
            className={`text-sm font-medium ${
              creneau.disponible ? "text-anthracite" : "text-gray-400 line-through"
            }`}
          >
            {creneau.debut} — {creneau.fin}
          </span>

          {creneau.disponible ? (
            <button
              type="button"
              disabled
              title="Réservation bientôt disponible"
              className="rounded bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              Réserver
            </button>
          ) : (
            <span className="text-xs text-gray-500">Réservé</span>
          )}
        </li>
      ))}
    </ul>
  );
}
