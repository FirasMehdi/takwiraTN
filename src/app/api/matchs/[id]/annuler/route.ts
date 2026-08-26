import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { annulerMatch } from "@/lib/matchs/queries";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await context.params;

  // Motif temporaire : la route lira le motif envoyé par le client à la
  // tâche 7, qui remplace entièrement ce fichier.
  const resultat = await annulerMatch({
    matchId: id,
    userId: session.user.id,
    raison: "personnel",
  });
  if (!resultat.ok) {
    const status = resultat.raison === "introuvable" ? 404 : 403;
    const message =
      resultat.raison === "introuvable"
        ? "Match introuvable"
        : "Seul l'organisateur peut annuler ce match";
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ message: "Match annulé." });
}
