import { getDashboardStats } from "@/lib/admin/dashboard";

function formatDateHeure(date: Date): string {
  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "Africa/Tunis",
  }).format(date);
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-anthracite">Tableau de bord administrateur</h1>
        <p className="mt-1 text-sm text-gray-600">{formatDateHeure(stats.maintenant)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">Joueurs inscrits</p>
          <p className="mt-1 text-2xl font-bold text-anthracite">{stats.totalJoueurs}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">Propriétaires</p>
          <p className="mt-1 text-2xl font-bold text-anthracite">{stats.totalProprietaires}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">Terrains</p>
          <p className="mt-1 text-2xl font-bold text-anthracite">{stats.totalTerrains}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-600">Matchs</p>
          <p className="mt-1 text-2xl font-bold text-anthracite">{stats.totalMatchs}</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-anthracite">Terrains par statut</h2>
        <ul className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
          <li>Actifs : {stats.terrainsParStatut.actif}</li>
          <li>En attente : {stats.terrainsParStatut.en_attente}</li>
          <li>Suspendus : {stats.terrainsParStatut.suspendu}</li>
        </ul>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-anthracite">Matchs par statut</h2>
        <ul className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
          <li>Ouverts : {stats.matchsParStatut.ouvert}</li>
          <li>Complets : {stats.matchsParStatut.complet}</li>
          <li>Annulés : {stats.matchsParStatut.annule}</li>
        </ul>
      </div>
    </div>
  );
}
