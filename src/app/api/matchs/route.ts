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
    include: { formats: { select: { format: true } } },
  });
  if (!terrain) {
    return NextResponse.json({ error: { terrainId: ["Terrain introuvable"] } }, { status: 404 });
  }

  // Le format demandé doit être un de ceux que ce terrain propose vraiment :
  // le formulaire ne montre que ceux-là, mais rien n'empêche d'appeler l'API
  // directement.
  if (!terrain.formats.some((offre) => offre.format === parsed.data.format)) {
    return NextResponse.json(
      { error: { format: ["Ce terrain ne propose pas ce format"] } },
      { status: 400 }
    );
  }

  const match = await creerMatch({
    terrainId: parsed.data.terrainId,
    organisateurId: session.user.id,
    date: parsed.data.date,
    heureDebut: parsed.data.heureDebut,
    heureFin: parsed.data.heureFin,
    format: parsed.data.format,
    joueursMax: parsed.data.joueursMax,
    organisateurParticipe: parsed.data.organisateurParticipe,
    description: parsed.data.description,
  });

  return NextResponse.json({ id: match.id }, { status: 201 });
}
