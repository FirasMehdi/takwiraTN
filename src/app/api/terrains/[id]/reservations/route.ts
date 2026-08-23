import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findTerrainById } from "@/lib/terrains/queries";
import { creerReservation } from "@/lib/reservations/queries";
import { reservationSchema } from "@/lib/validation/reservation";
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

  const parsed = reservationSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Revalide côté serveur que le créneau demandé existe réellement et est
  // disponible pour cette date — ne jamais faire confiance à ce que le
  // client affichait.
  const terrain = await findTerrainById(id, parsed.data.date);
  if (!terrain) {
    return NextResponse.json({ error: "Terrain introuvable" }, { status: 404 });
  }

  const creneau = terrain.creneaux.find((c) => c.debut === parsed.data.heureDebut);
  if (!creneau || !creneau.disponible) {
    return NextResponse.json(
      { error: { heureDebut: ["Ce créneau n'est plus disponible."] } },
      { status: 409 }
    );
  }

  const resultat = await creerReservation({
    terrainId: id,
    userId: session.user.id,
    date: parsed.data.date,
    heureDebut: creneau.debut,
    heureFin: creneau.fin,
  });

  if (!resultat.ok) {
    return NextResponse.json(
      { error: { heureDebut: ["Ce créneau vient d'être réservé."] } },
      { status: 409 }
    );
  }

  return NextResponse.json({ id: resultat.id }, { status: 201 });
}
