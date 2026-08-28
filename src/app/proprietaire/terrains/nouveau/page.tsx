import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { CreerTerrainForm } from "@/components/proprietaire/CreerTerrainForm";

export default async function NouveauTerrainPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    redirect("/");
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-10">
      <h1 className="text-center text-xl font-semibold text-anthracite">Ajouter un terrain</h1>
      <CreerTerrainForm />
    </main>
  );
}
