import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { createPasswordResetToken } from "@/lib/resetToken";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { deliverPasswordResetLink } from "@/lib/mailer";
import { checkRateLimit, extractIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const ip = extractIp(request.headers);

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = forgotPasswordSchema.safeParse(parsedBody.data);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // A 429 here would itself become an account-enumeration oracle at a lower
  // request volume than exists today, so rate limiting is silent: when the
  // per-email or per-IP limit is hit, we skip token creation but still
  // return the same 200 with the same generic message. "Rate limited" and
  // "unknown email" must look identical from the outside.
  const emailLimit = checkRateLimit(`forgot:${parsed.data.email}`, { max: 3, windowMs: 60 * 60 * 1000 });
  const ipLimit = checkRateLimit(`forgot-ip:${ip}`, { max: 20, windowMs: 60 * 60 * 1000 });

  if (emailLimit.allowed && ipLimit.allowed) {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user) {
      // Cap outstanding tokens at one per user: a fresh request supersedes
      // any still-live token rather than piling up new ones (closes an
      // unbounded-token-accumulation issue — repeated requests for one
      // address previously left many live rows).
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reinitialiser-mot-de-passe/${token}`;
      deliverPasswordResetLink({ email: user.email, resetUrl });
    }
  }

  return NextResponse.json({ message: "Si ce compte existe, un e-mail a été envoyé." });
}
