import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { createPasswordResetToken } from "@/lib/resetToken";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reinitialiser-mot-de-passe/${token}`;
    console.log(`[reset-password] lien pour ${user.email} : ${resetUrl}`);
  }

  return NextResponse.json({ message: "Si ce compte existe, un e-mail a été envoyé." });
}
