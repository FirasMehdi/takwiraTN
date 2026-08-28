import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { listerTerrainsProprietaire } from "@/lib/terrains/gestion";
import { TerrainGestionCard } from "@/components/proprietaire/TerrainGestionCard";

export default async function ProprietaireTerrainsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    redirect("/");
  }

  const terrains = await listerTerrainsProprietaire(session.user.id);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-anthracite">Mes terrains</h1>
        <Link
          href="/proprietaire/terrains/nouveau"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          Ajouter un terrain
        </Link>
      </div>

      {terrains.length === 0 ? (
        <p className="mt-6 text-center text-gray-600">
          Vous n&apos;avez pas encore ajouté de terrain.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {terrains.map((terrain) => (
            <TerrainGestionCard key={terrain.id} terrain={terrain} />
          ))}
        </div>
      )}
    </main>
  );
}
