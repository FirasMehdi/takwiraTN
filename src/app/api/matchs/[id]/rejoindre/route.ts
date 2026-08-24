import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rejoindreMatch } from "@/lib/matchs/queries";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await context.params;

  const resultat = await rejoindreMatch(id, session.user.id);
  if (!resultat.ok) {
    if (resultat.raison === "introuvable") {
      return NextResponse.json({ error: "Match introuvable" }, { status: 404 });
    }
    if (resultat.raison === "deja_inscrit") {
      return NextResponse.json({ error: "Vous êtes déjà inscrit à ce match" }, { status: 409 });
    }
    return NextResponse.json({ error: "Ce match est complet" }, { status: 409 });
  }

  return NextResponse.json({ message: "Inscription confirmée." });
}
