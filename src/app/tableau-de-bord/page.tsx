import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function TableauDeBordPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="px-4 py-10">
      <h1 className="text-xl font-semibold">Tableau de bord</h1>
      <p className="mt-2 text-gray-600">
        Bienvenue {session?.user?.email}. Vos réservations et matchs apparaîtront ici bientôt.
      </p>
    </main>
  );
}
