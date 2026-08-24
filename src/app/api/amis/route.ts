import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { envoyerDemandeSchema } from "@/lib/validation/amis";
import { envoyerDemande } from "@/lib/amis/queries";
import { parseJsonBody } from "@/lib/api/parseJsonBody";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = envoyerDemandeSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await envoyerDemande(session.user.id, parsed.data.destinataireId);
  if (!resultat.ok) {
    const messages: Record<typeof resultat.raison, string> = {
      soi_meme: "Vous ne pouvez pas vous ajouter vous-même.",
      deja_amis: "Vous êtes déjà amis.",
      demande_existante: "Une demande est déjà en attente.",
    };
    return NextResponse.json({ error: messages[resultat.raison] }, { status: 409 });
  }

  return NextResponse.json({ id: resultat.id }, { status: 201 });
}
