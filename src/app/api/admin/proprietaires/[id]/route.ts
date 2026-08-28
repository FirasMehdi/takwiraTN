import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { findAdminProprietaireById, deleteAdminProprietaire } from "@/lib/admin/proprietaires";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const acces = requireRole(session, "administrateur");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id } = await context.params;
  const proprietaire = await findAdminProprietaireById(id);
  if (!proprietaire) {
    return NextResponse.json({ error: "Propriétaire introuvable" }, { status: 404 });
  }

  return NextResponse.json(proprietaire);
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
  const resultat = await deleteAdminProprietaire(id);
  if (!resultat.ok) {
    return NextResponse.json({ error: "Propriétaire introuvable" }, { status: 404 });
  }

  return NextResponse.json({ message: "Propriétaire supprimé." });
}
