import { notFound } from "next/navigation";
import { findAdminProprietaireById } from "@/lib/admin/proprietaires";
import { AdminSupprimerButton } from "@/components/admin/AdminSupprimerButton";

const STATUT_LIBELLES: Record<string, string> = {
  actif: "Actif",
  en_attente: "En attente",
  suspendu: "Suspendu",
};

export default async function AdminProprietaireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proprietaire = await findAdminProprietaireById(id);
  if (!proprietaire) notFound();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-anthracite">{proprietaire.email}</h1>
        <p className="text-sm text-gray-600">
          Inscrit le {new Intl.DateTimeFormat("fr-TN").format(proprietaire.createdAt)}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-anthracite">
          Terrains ({proprietaire.terrains.length})
        </h2>
        {proprietaire.terrains.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Aucun terrain enregistré.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {proprietaire.terrains.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm">
                <span>
                  {t.nom} — {t.ville}
                </span>
                <span className="text-gray-500">{STATUT_LIBELLES[t.statut] ?? t.statut}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-semibold text-red-700">Zone de danger</h2>
        <p className="mt-1 text-sm text-red-700">
          Supprimer ce compte détache ses terrains (ils deviennent des terrains de démonstration
          sans propriétaire) et efface ses données personnelles. Cette action est irréversible.
        </p>
        <div className="mt-3">
          <AdminSupprimerButton
            url={`/api/admin/proprietaires/${proprietaire.id}`}
            confirmation={`Supprimer définitivement le compte de ${proprietaire.email} ?`}
            redirectApres="/admin/proprietaires"
          />
        </div>
      </div>
    </div>
  );
}
