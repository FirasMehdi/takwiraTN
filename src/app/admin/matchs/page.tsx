import { findAdminMatchs } from "@/lib/admin/matchs";
import { AdminAnnulerMatchForm } from "@/components/admin/AdminAnnulerMatchForm";

const STATUT_LIBELLES: Record<string, string> = {
  ouvert: "Ouvert",
  complet: "Complet",
  annule: "Annulé",
};

export default async function AdminMatchsPage() {
  const matchs = await findAdminMatchs();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-anthracite">Matchs</h1>
      <div className="flex flex-col gap-3">
        {matchs.map((m) => (
          <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-anthracite">
                  {m.terrainNom} — {m.terrainVille}
                </p>
                <p className="text-sm text-gray-600">
                  {m.date} · {m.heureDebut}–{m.heureFin} · {m.joueursInscrits}/{m.joueursMax} joueurs
                </p>
                <p className="text-sm text-gray-600">Organisateur : {m.organisateurEmail}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                {STATUT_LIBELLES[m.statut] ?? m.statut}
              </span>
            </div>
            {m.statut !== "annule" && (
              <div className="mt-3">
                <AdminAnnulerMatchForm matchId={m.id} />
              </div>
            )}
          </div>
        ))}
        {matchs.length === 0 && (
          <p className="py-8 text-center text-gray-600">Aucun match enregistré.</p>
        )}
      </div>
    </div>
  );
}
