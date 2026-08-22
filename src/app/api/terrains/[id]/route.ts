import { NextResponse } from "next/server";
import { findTerrainById } from "@/lib/terrains/queries";
import { terrainDetailQuerySchema } from "@/lib/validation/terrain";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);

  const brut = Object.fromEntries(
    [...searchParams.entries()].filter(([, valeur]) => valeur !== "")
  );

  const parsed = terrainDetailQuerySchema.safeParse(brut);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const terrain = await findTerrainById(id, parsed.data.date);
  if (!terrain) {
    return NextResponse.json({ error: "Terrain introuvable" }, { status: 404 });
  }

  return NextResponse.json(terrain);
}
