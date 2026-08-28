import { findAdminTerrains } from "@/lib/admin/terrains";
import { libelleType } from "@/lib/terrains/format";
import { AdminTerrainStatutForm } from "@/components/admin/AdminTerrainStatutForm";
import { AdminSupprimerButton } from "@/components/admin/AdminSupprimerButton";

export default async function AdminTerrainsPage() {
  const terrains = await findAdminTerrains();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-anthracite">Terrains</h1>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Ville</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Propriétaire</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {terrains.map((t) => (
              <tr key={t.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 font-medium text-anthracite">{t.nom}</td>
                <td className="px-4 py-2 text-gray-600">{t.ville}</td>
                <td className="px-4 py-2 text-gray-600">{libelleType(t.type)}</td>
                <td className="px-4 py-2 text-gray-600">{t.ownerEmail ?? "Terrain de démonstration"}</td>
                <td className="px-4 py-2">
                  <AdminTerrainStatutForm terrainId={t.id} statutActuel={t.statut} />
                </td>
                <td className="px-4 py-2">
                  <AdminSupprimerButton
                    url={`/api/admin/terrains/${t.id}`}
                    confirmation={`Supprimer définitivement le terrain "${t.nom}" ?`}
                    redirectApres="/admin/terrains"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {terrains.length === 0 && (
          <p className="px-4 py-6 text-center text-gray-600">Aucun terrain enregistré.</p>
        )}
      </div>
    </div>
  );
}
