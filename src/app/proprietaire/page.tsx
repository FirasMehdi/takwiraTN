import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { listerTerrainsProprietaire } from "@/lib/terrains/gestion";

export default async function ProprietaireDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    redirect("/");
  }

  const terrains = await listerTerrainsProprietaire(session.user.id);
  const actifs = terrains.filter((t) => t.statut === "actif").length;
  const enAttente = terrains.filter((t) => t.statut === "en_attente").length;
  const suspendus = terrains.filter((t) => t.statut === "suspendu").length;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10">
      <h1 className="text-xl font-semibold text-anthracite">Espace propriétaire</h1>
      <p className="mt-2 text-gray-600">Bienvenue {session.user.email}.</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-anthracite">{terrains.length}</p>
          <p className="text-xs text-gray-600">Terrain{terrains.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-primary">{actifs}</p>
          <p className="text-xs text-gray-600">Actif{actifs > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-500">{enAttente + suspendus}</p>
          <p className="text-xs text-gray-600">En attente / suspendu</p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/proprietaire/terrains"
          className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark"
        >
          Gérer mes terrains
        </Link>
        <Link
          href="/proprietaire/terrains/nouveau"
          className="rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-primary/5"
        >
          Ajouter un terrain
        </Link>
      </div>
    </main>
  );
}
