import { NextResponse } from "next/server";
import { findTerrains } from "@/lib/terrains/queries";
import { terrainListQuerySchema } from "@/lib/validation/terrain";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Les paramètres absents ne doivent pas devenir des chaînes vides.
  const brut = Object.fromEntries(
    [...searchParams.entries()].filter(([, valeur]) => valeur !== "")
  );

  const parsed = terrainListQuerySchema.safeParse(brut);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const terrains = await findTerrains(parsed.data);
  return NextResponse.json({ terrains });
}
