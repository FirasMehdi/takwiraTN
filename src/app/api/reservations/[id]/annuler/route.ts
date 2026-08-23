import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { annulerReservation } from "@/lib/reservations/queries";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;

  const resultat = await annulerReservation(id, session.user.id);

  if (!resultat.ok) {
    if (resultat.raison === "introuvable") {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Annulation impossible à moins de 24h du créneau." },
      { status: 409 }
    );
  }

  return NextResponse.json({ message: "Réservation annulée." });
}
