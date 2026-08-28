import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { modifierHorairesSchema } from "@/lib/validation/proprietaire";
import { modifierHoraires } from "@/lib/terrains/gestion";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id } = await context.params;
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = modifierHorairesSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await modifierHoraires(id, session.user.id, parsed.data.horaires);
  if (!resultat.ok) {
    const status = resultat.raison === "introuvable" ? 404 : 403;
    const message =
      resultat.raison === "introuvable"
        ? "Terrain introuvable"
        : "Vous n'êtes pas le propriétaire de ce terrain";
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ message: "Horaires mis à jour." });
}
