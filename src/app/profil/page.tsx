import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilForm } from "@/components/forms/ProfilForm";
import { DeconnexionButton } from "@/components/auth/DeconnexionButton";

export default async function ProfilPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    redirect("/connexion");
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <h1 className="px-4 pt-6 text-center text-xl font-semibold text-anthracite">Mon profil</h1>
        <ProfilForm profile={profile} />
        <div className="px-4 pb-6">
          {session.user.role === "proprietaire" && (
            <Link
              href="/proprietaire"
              className="mb-3 block rounded-lg border border-primary px-4 py-3 text-center font-semibold text-primary transition hover:bg-primary/5"
            >
              Gérer mes terrains
            </Link>
          )}
          <DeconnexionButton />
        </div>
      </div>
    </main>
  );
}
