import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sontAmis } from "@/lib/amis/queries";
import { findConversation } from "@/lib/messages/queries";
import { prisma } from "@/lib/prisma";
import { ConversationThread } from "@/components/messages/ConversationThread";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  const { id } = await params;

  if (!(await sontAmis(session.user.id, id))) {
    notFound();
  }

  const autre = await prisma.user.findUnique({
    where: { id },
    select: { profile: { select: { prenom: true } } },
  });
  if (!autre) notFound();

  const messages = await findConversation(session.user.id, id);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-6">
      <Link href="/amis" className="text-sm text-primary hover:underline">
        ← Retour aux amis
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-anthracite">
        {autre.profile?.prenom ?? "Conversation"}
      </h1>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <ConversationThread
          autreUserId={id}
          moiId={session.user.id}
          messages={messages.map((m) => ({
            id: m.id,
            expediteurId: m.expediteurId,
            contenu: m.contenu,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
