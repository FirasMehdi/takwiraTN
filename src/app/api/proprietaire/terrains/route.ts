import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { creerTerrainSchema } from "@/lib/validation/proprietaire";
import { creerTerrain } from "@/lib/terrains/gestion";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = creerTerrainSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const terrain = await creerTerrain(session.user.id, parsed.data);
  return NextResponse.json({ id: terrain.id }, { status: 201 });
}
