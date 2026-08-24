import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { refuserDemande } from "@/lib/amis/queries";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await context.params;

  const resultat = await refuserDemande(id, session.user.id);
  if (!resultat.ok) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  return NextResponse.json({ message: "Demande refusée." });
}
