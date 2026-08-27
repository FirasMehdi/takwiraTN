import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { annulerMatch } from "@/lib/matchs/queries";
import { annulerMatchSchema } from "@/lib/validation/match";
import { parseJsonBody } from "@/lib/api/parseJsonBody";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await context.params;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = annulerMatchSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    // MatchActions affiche `error` tel quel quand c'est une chaîne : on
    // renvoie donc le premier message plutôt qu'un objet de champs.
    const message = parsed.error.issues[0]?.message ?? "Motif d'annulation invalide";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const resultat = await annulerMatch({
    matchId: id,
    userId: session.user.id,
    raison: parsed.data.raison,
    raisonAutre: parsed.data.raisonAutre,
  });

  if (!resultat.ok) {
    const reponses: Record<typeof resultat.raison, { message: string; status: number }> = {
      introuvable: { message: "Match introuvable", status: 404 },
      non_autorise: { message: "Seul l'organisateur peut annuler ce match", status: 403 },
      deja_annule: { message: "Ce match est déjà annulé", status: 409 },
      raison_autre_requise: { message: "Précisez le motif de l'annulation", status: 400 },
    };
    const reponse = reponses[resultat.raison];
    return NextResponse.json({ error: reponse.message }, { status: reponse.status });
  }

  return NextResponse.json({ message: "Match annulé." });
}
