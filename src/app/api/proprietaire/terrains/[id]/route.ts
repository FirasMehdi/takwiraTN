import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { modifierTerrainSchema } from "@/lib/validation/proprietaire";
import { modifierTerrain, supprimerTerrain } from "@/lib/terrains/gestion";

function statutPour(raison: "introuvable" | "non_autorise" | "reservations_actives"): number {
  if (raison === "introuvable") return 404;
  if (raison === "non_autorise") return 403;
  return 409;
}

function messagePour(raison: "introuvable" | "non_autorise" | "reservations_actives"): string {
  if (raison === "introuvable") return "Terrain introuvable";
  if (raison === "non_autorise") return "Vous n'êtes pas le propriétaire de ce terrain";
  return "Impossible de supprimer ce terrain : des réservations ou des matchs à venir y sont encore rattachés";
}

export async function PATCH(
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

  const parsed = modifierTerrainSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await modifierTerrain(id, session.user.id, parsed.data);
  if (!resultat.ok) {
    return NextResponse.json({ error: messagePour(resultat.raison) }, { status: statutPour(resultat.raison) });
  }

  return NextResponse.json({ message: "Terrain mis à jour." });
}

export async function DELETE(
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
  const resultat = await supprimerTerrain(id, session.user.id);
  if (!resultat.ok) {
    return NextResponse.json({ error: messagePour(resultat.raison) }, { status: statutPour(resultat.raison) });
  }

  return NextResponse.json({ message: "Terrain supprimé." });
}
