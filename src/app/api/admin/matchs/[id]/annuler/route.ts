import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireRole } from "@/lib/auth/authorization";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { adminAnnulerMatchSchema } from "@/lib/validation/admin";
import { annulerMatchAdmin } from "@/lib/admin/matchs";

export async function POST(
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

  const parsed = adminAnnulerMatchSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // requireRole n'a renvoyé ok:true que si `session.user` existe (sinon
  // c'est un 401) — TypeScript ne peut pas relier ce contrôle de flux à
  // travers l'appel de fonction, d'où l'assertion non-null ici.
  const adminId = session!.user.id;

  const resultat = await annulerMatchAdmin({
    matchId: id,
    adminId,
    raison: parsed.data.raison,
    raisonAutre: parsed.data.raisonAutre,
  });

  if (!resultat.ok) {
    const status = resultat.raison === "introuvable" ? 404 : 409;
    const message =
      resultat.raison === "introuvable" ? "Match introuvable" : "Ce match est déjà annulé";
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ message: "Match annulé." });
}
