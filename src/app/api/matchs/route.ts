import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creerMatchSchema } from "@/lib/validation/match";
import { creerMatch } from "@/lib/matchs/queries";
import { parseJsonBody } from "@/lib/api/parseJsonBody";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = creerMatchSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const terrain = await prisma.terrain.findFirst({
    where: { id: parsed.data.terrainId, statut: "actif" },
  });
  if (!terrain) {
    return NextResponse.json({ error: { terrainId: ["Terrain introuvable"] } }, { status: 404 });
  }

  const match = await creerMatch({
    terrainId: parsed.data.terrainId,
    organisateurId: session.user.id,
    date: parsed.data.date,
    heureDebut: parsed.data.heureDebut,
    heureFin: parsed.data.heureFin,
    joueursMax: parsed.data.joueursMax,
    description: parsed.data.description,
  });

  return NextResponse.json({ id: match.id }, { status: 201 });
}
