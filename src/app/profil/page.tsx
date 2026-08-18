import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilForm } from "@/components/forms/ProfilForm";

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
    <main className="px-4 py-6">
      <h1 className="text-center text-xl font-semibold">Mon profil</h1>
      <ProfilForm profile={profile} />
    </main>
  );
}
