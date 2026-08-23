import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { consumePasswordResetToken } from "@/lib/resetToken";
import { hashPassword } from "@/lib/password";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { checkRateLimit, extractIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const ip = extractIp(request.headers);
  const limit = checkRateLimit(`reset:${ip}`, { max: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = resetPasswordSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const result = await prisma.$transaction(async (tx) => {
    const consumed = await consumePasswordResetToken(parsed.data.token, tx);
    if (!consumed.valid) return consumed;

    await tx.user.update({
      where: { id: consumed.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });

    // Invalidate any other outstanding reset tokens for this user so a
    // successful reset can't be followed by reuse of a stale link.
    await tx.passwordResetToken.deleteMany({
      where: { userId: consumed.userId, usedAt: null },
    });

    return consumed;
  });

  if (!result.valid) {
    const message =
      result.reason === "expired"
        ? "Ce lien a expiré, veuillez en redemander un."
        : "Ce lien n'est plus valide, veuillez en redemander un.";
    return NextResponse.json({ error: { token: [message] } }, { status: 400 });
  }

  return NextResponse.json({ message: "Mot de passe mis à jour." });
}
