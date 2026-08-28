import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { adminTerrainStatutSchema } from "@/lib/validation/admin";
import { updateAdminTerrainStatut, deleteAdminTerrain } from "@/lib/admin/terrains";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const acces = requireRole(session, "administrateur");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id } = await context.params;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = adminTerrainStatutSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await updateAdminTerrainStatut(id, parsed.data.statut);
  if (!resultat.ok) {
    return NextResponse.json({ error: "Terrain introuvable" }, { status: 404 });
  }

  return NextResponse.json({ message: "Statut mis à jour." });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const acces = requireRole(session, "administrateur");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id } = await context.params;
  const resultat = await deleteAdminTerrain(id);
  if (!resultat.ok) {
    return NextResponse.json({ error: "Terrain introuvable" }, { status: 404 });
  }

  return NextResponse.json({ message: "Terrain supprimé." });
}
