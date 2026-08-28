import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { trouverTerrainProprietaire } from "@/lib/terrains/gestion";
import { ModifierTerrainForm } from "@/components/proprietaire/ModifierTerrainForm";
import { FormatsManager } from "@/components/proprietaire/FormatsManager";
import { HorairesManager } from "@/components/proprietaire/HorairesManager";
import { SupprimerTerrainButton } from "@/components/proprietaire/SupprimerTerrainButton";

export default async function ModifierTerrainPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    redirect("/");
  }

  const { id } = await params;
  const terrain = await trouverTerrainProprietaire(id, session.user.id);
  if (!terrain) notFound();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10">
      <Link href="/proprietaire/terrains" className="text-sm text-primary hover:underline">
        ← Retour à mes terrains
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-anthracite">{terrain.nom}</h1>
        <SupprimerTerrainButton terrainId={terrain.id} />
      </div>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-anthracite">Informations générales</h2>
        <div className="mt-3">
          <ModifierTerrainForm
            terrainId={terrain.id}
            nom={terrain.nom}
            description={terrain.description ?? null}
            adresse={terrain.adresse}
            ville={terrain.ville}
            latitude={terrain.latitude ?? null}
            longitude={terrain.longitude ?? null}
            type={terrain.type}
            dureeCreneauMinutes={terrain.dureeCreneauMinutes ?? 90}
            equipements={terrain.equipements ?? []}
          />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-anthracite">Formats et tarifs</h2>
        <div className="mt-3">
          <FormatsManager terrainId={terrain.id} formats={terrain.formats} />
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-anthracite">Horaires d&apos;ouverture</h2>
        <div className="mt-3">
          <HorairesManager terrainId={terrain.id} horaires={terrain.horaires} />
        </div>
      </section>
    </main>
  );
}
