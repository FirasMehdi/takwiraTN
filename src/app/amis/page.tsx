import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAmis, findDemandesRecues } from "@/lib/amis/queries";
import { AmiCard } from "@/components/amis/AmiCard";
import { DemandeCard } from "@/components/amis/DemandeCard";

export default async function AmisPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  const [amis, demandes] = await Promise.all([
    findAmis(session.user.id),
    findDemandesRecues(session.user.id),
  ]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-6">
      <h1 className="text-xl font-semibold text-anthracite">Amis</h1>

      {demandes.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold text-anthracite">Demandes reçues</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {demandes.map((d) => (
              <DemandeCard key={d.id} id={d.id} prenom={d.prenom} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4">
        <h2 className="text-sm font-semibold text-anthracite">Mes amis</h2>
        {amis.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">
            Vous n&apos;avez pas encore d&apos;amis. Trouvez des coéquipiers sur la page Joueurs.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {amis.map((ami) => (
              <li key={ami.id}>
                <AmiCard ami={ami} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
