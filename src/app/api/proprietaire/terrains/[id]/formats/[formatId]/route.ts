import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { modifierFormatSchema } from "@/lib/validation/proprietaire";
import { modifierFormat, supprimerFormat } from "@/lib/terrains/gestion";

function statutPour(raison: "introuvable" | "non_autorise" | "dernier_format"): number {
  if (raison === "introuvable") return 404;
  if (raison === "non_autorise") return 403;
  return 409;
}

function messagePour(raison: "introuvable" | "non_autorise" | "dernier_format"): string {
  if (raison === "introuvable") return "Format introuvable";
  if (raison === "non_autorise") return "Vous n'êtes pas le propriétaire de ce terrain";
  return "Impossible de supprimer le dernier format d'un terrain";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; formatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id, formatId } = await context.params;
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = modifierFormatSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await modifierFormat(id, session.user.id, formatId, parsed.data);
  if (!resultat.ok) {
    return NextResponse.json({ error: messagePour(resultat.raison) }, { status: statutPour(resultat.raison) });
  }

  return NextResponse.json({ message: "Format mis à jour." });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; formatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const acces = requireRole(session, "proprietaire");
  if (!acces.ok) {
    return NextResponse.json({ error: acces.erreur }, { status: acces.statut });
  }

  const { id, formatId } = await context.params;
  const resultat = await supprimerFormat(id, session.user.id, formatId);
  if (!resultat.ok) {
    return NextResponse.json({ error: messagePour(resultat.raison) }, { status: statutPour(resultat.raison) });
  }

  return NextResponse.json({ message: "Format supprimé." });
}
