import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deciderReservationMatch } from "@/lib/matchs/queries";
import { decisionReservationSchema } from "@/lib/validation/match";
import { parseJsonBody } from "@/lib/api/parseJsonBody";

/**
 * Décision de réservation de fin de match. Réservée à l'organisateur —
 * la vérification est faite côté requête (deciderReservationMatch), pas
 * seulement à l'affichage du bouton, comme partout ailleurs.
 */
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

  const parsed = decisionReservationSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Précisez votre décision" }, { status: 400 });
  }

  const resultat = await deciderReservationMatch(id, session.user.id, parsed.data.reserver);

  if (!resultat.ok) {
    const reponses: Record<typeof resultat.raison, { message: string; status: number }> = {
      introuvable: { message: "Match introuvable", status: 404 },
      non_autorise: {
        message: "Seul l'organisateur peut décider de la réservation",
        status: 403,
      },
      annule: { message: "Ce match a été annulé", status: 409 },
      pas_termine: { message: "Ce match n'est pas encore terminé", status: 409 },
      deja_decide: { message: "La décision a déjà été prise pour ce match", status: 409 },
      conflit: { message: "Ce créneau est déjà réservé", status: 409 },
    };
    const reponse = reponses[resultat.raison];
    return NextResponse.json({ error: reponse.message }, { status: reponse.status });
  }

  return NextResponse.json({
    message: resultat.reservationId ? "Créneau réservé." : "Décision enregistrée.",
    reservationId: resultat.reservationId,
  });
}
