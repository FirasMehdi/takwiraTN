import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { profilSchema } from "@/lib/validation/profil";
import { findAdminJoueurById, updateAdminJoueur, deleteAdminJoueur } from "@/lib/admin/joueurs";

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
  const joueur = await findAdminJoueurById(id);
  if (!joueur) {
    return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
  }

  return NextResponse.json(joueur);
}

export async function PUT(
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

  const parsed = profilSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await updateAdminJoueur(id, parsed.data);
  if (!resultat.ok) {
    return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
  }

  const joueur = await findAdminJoueurById(id);
  return NextResponse.json(joueur);
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
  const resultat = await deleteAdminJoueur(id);
  if (!resultat.ok) {
    return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
  }

  return NextResponse.json({ message: "Joueur supprimé." });
}
