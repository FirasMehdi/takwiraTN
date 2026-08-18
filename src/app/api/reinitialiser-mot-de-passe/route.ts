import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { consumePasswordResetToken } from "@/lib/resetToken";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const result = await consumePasswordResetToken(parsed.data.token);
  if (!result.valid) {
    const message =
      result.reason === "expired"
        ? "Ce lien a expiré, veuillez en redemander un."
        : "Ce lien n'est plus valide, veuillez en redemander un.";
    return NextResponse.json({ error: { token: [message] } }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: result.userId },
    data: { passwordHash },
  });

  return NextResponse.json({ message: "Mot de passe mis à jour." });
}
