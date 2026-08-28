import { findAdminAnnulations } from "@/lib/admin/annulations";

const RAISON_LIBELLES: Record<string, string> = {
  personnel: "Personnel",
  pas_assez_joueurs: "Pas assez de joueurs",
  conflit_horaire: "Conflit d'horaire",
  terrain_indisponible: "Terrain indisponible",
  autre: "Autre",
};

export default async function AdminAnnulationsPage() {
  const annulations = await findAdminAnnulations();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-anthracite">Historique des annulations</h1>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Cible</th>
              <th className="px-4 py-2">Motif</th>
              <th className="px-4 py-2">Par</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {annulations.map((a) => (
              <tr key={a.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2">{a.cible}</td>
                <td className="px-4 py-2 text-gray-600">
                  {RAISON_LIBELLES[a.raison] ?? a.raison}
                  {a.raisonAutre ? ` — ${a.raisonAutre}` : ""}
                </td>
                <td className="px-4 py-2 text-gray-600">{a.userEmail}</td>
                <td className="px-4 py-2 text-gray-600">
                  {new Intl.DateTimeFormat("fr-TN", { dateStyle: "short", timeStyle: "short" }).format(
                    a.createdAt
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {annulations.length === 0 && (
          <p className="px-4 py-6 text-center text-gray-600">Aucune annulation enregistrée.</p>
        )}
      </div>
    </div>
  );
}
