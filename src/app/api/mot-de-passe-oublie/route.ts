import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { createPasswordResetToken } from "@/lib/resetToken";
import { parseJsonBody } from "@/lib/api/parseJsonBody";
import { deliverPasswordResetLink } from "@/lib/mailer";

export async function POST(request: Request) {
  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = forgotPasswordSchema.safeParse(parsedBody.data);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reinitialiser-mot-de-passe/${token}`;
    deliverPasswordResetLink({ email: user.email, resetUrl });
  }

  return NextResponse.json({ message: "Si ce compte existe, un e-mail a été envoyé." });
}
