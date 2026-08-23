import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation/auth";
import { resolveAuthSecret } from "@/lib/env";
import { checkRateLimit, extractIp } from "@/lib/rateLimit";

// A fixed, harmless "compare against something" target — not a real
// credential. Paying the bcrypt cost on every path (whether the account
// exists or not) keeps response timing from revealing account existence.
const DUMMY_HASH = bcrypt.hashSync("no-such-account-timing-guard", 10);

export async function authorizeCredentials(
  credentials: Record<string, string> | undefined,
  ip: string = "unknown"
) {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const limit = checkRateLimit(`login:${parsed.data.email}:${ip}`, {
    max: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) return null;

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    // Pay the same bcrypt cost whether or not the account exists, so
    // response timing doesn't reveal account existence.
    await bcrypt.compare(parsed.data.password, DUMMY_HASH);
    return null;
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, role: user.role, sessionVersion: user.sessionVersion };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: resolveAuthSecret(),
  pages: {
    signIn: "/connexion",
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: (credentials, req) =>
        authorizeCredentials(
          credentials as Record<string, string> | undefined,
          extractIp(req?.headers)
        ),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion;
        return token;
      }

      // Re-checked on every subsequent read of this token (getServerSession,
      // useSession, and the /api/auth/session endpoint all re-invoke this
      // callback). If a password reset has bumped the stored version since
      // this token was issued, throwing here makes NextAuth resolve the
      // session as signed out for every caller that goes through the
      // callback pipeline — the standard NextAuth v4 pattern for
      // server-side session invalidation under the JWT strategy (there's no
      // "return null to sign out" contract for this callback).
      //
      // Known, deliberate gap: `next-auth/middleware`'s `withAuth` (used in
      // src/middleware.ts) reads the raw cookie via `getToken()`, which
      // decodes the JWT WITHOUT invoking this callback — so a just-revoked
      // token can still pass the middleware gate until it naturally
      // expires. What actually closes this for a user who reset their
      // password is the page-level `getServerSession` check that /profil
      // and /tableau-de-bord already perform independently — it re-runs
      // this callback on every page load and will correctly reject a stale
      // token. Closing the middleware-level gap too would require a DB call
      // from Edge middleware, which conflicts with Prisma's Node-only query
      // engine; out of scope here.
      const current = await prisma.user.findUnique({
        where: { id: token.id },
        select: { sessionVersion: true },
      });
      if (!current || current.sessionVersion !== token.sessionVersion) {
        throw new Error("Session invalidée (mot de passe changé ou compte supprimé).");
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
