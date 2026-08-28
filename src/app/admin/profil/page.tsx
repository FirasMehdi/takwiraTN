import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilForm } from "@/components/forms/ProfilForm";
import { DeconnexionButton } from "@/components/auth/DeconnexionButton";

export default async function AdminProfilPage() {
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
    <div className="flex w-full max-w-sm flex-col gap-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <h1 className="px-4 pt-6 text-center text-xl font-semibold text-anthracite">
        Mon profil administrateur
      </h1>
      <ProfilForm profile={profile} />
      <div className="px-4 pb-6">
        <DeconnexionButton />
      </div>
    </div>
  );
}
