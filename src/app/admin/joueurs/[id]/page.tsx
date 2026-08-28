import { notFound } from "next/navigation";
import { findAdminJoueurById } from "@/lib/admin/joueurs";
import { AdminJoueurForm } from "@/components/admin/AdminJoueurForm";
import { AdminSupprimerButton } from "@/components/admin/AdminSupprimerButton";

export default async function AdminJoueurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const joueur = await findAdminJoueurById(id);
  if (!joueur) notFound();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-anthracite">{joueur.prenom}</h1>
        <p className="text-sm text-gray-600">{joueur.email}</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <AdminJoueurForm joueurId={joueur.id} profile={joueur} />
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-semibold text-red-700">Zone de danger</h2>
        <p className="mt-1 text-sm text-red-700">
          Supprimer ce compte efface aussi son profil, ses réservations, ses matchs organisés, ses
          participations, ses messages et ses notifications. Cette action est irréversible.
        </p>
        <div className="mt-3">
          <AdminSupprimerButton
            url={`/api/admin/joueurs/${joueur.id}`}
            confirmation={`Supprimer définitivement le compte de ${joueur.prenom} (${joueur.email}) ?`}
            redirectApres="/admin/joueurs"
          />
        </div>
      </div>
    </div>
  );
}
