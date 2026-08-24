import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { envoyerMessageSchema } from "@/lib/validation/amis";
import { envoyerMessage, findConversation } from "@/lib/messages/queries";
import { parseJsonBody } from "@/lib/api/parseJsonBody";

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { userId } = await context.params;

  const messages = await findConversation(session.user.id, userId);
  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { userId } = await context.params;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = envoyerMessageSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await envoyerMessage(session.user.id, userId, parsed.data.contenu);
  if (!resultat.ok) {
    return NextResponse.json(
      { error: "Vous ne pouvez envoyer un message qu'à un ami." },
      { status: 403 }
    );
  }

  return NextResponse.json({ id: resultat.id }, { status: 201 });
}
