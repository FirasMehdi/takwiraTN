/** The value shipped in `.env.example` — never valid outside development. */
export const PLACEHOLDER_AUTH_SECRET = "change-me-in-dev";

type EnvLike = {
  NEXTAUTH_SECRET?: string;
  NODE_ENV?: string;
  NEXT_PHASE?: string;
};

/**
 * Resolve the NextAuth signing secret, refusing to start in production with a
 * missing or placeholder value. A predictable secret means anyone who has read
 * this repository can forge a session token for any account, so failing loudly
 * at boot is far better than serving traffic with forgeable sessions.
 *
 * The build phase is exempt: `next build` runs with NODE_ENV=production, but the
 * real secret is injected at runtime, so enforcing here would only break CI.
 */
export function resolveAuthSecret(env: EnvLike = process.env): string | undefined {
  const secret = env.NEXTAUTH_SECRET?.trim();
  const isBuild = env.NEXT_PHASE === "phase-production-build";

  if (
    env.NODE_ENV === "production" &&
    !isBuild &&
    (!secret || secret === PLACEHOLDER_AUTH_SECRET)
  ) {
    throw new Error(
      "NEXTAUTH_SECRET est manquant ou n'a pas été changé depuis .env.example. " +
        "Générez-en un avec `openssl rand -base64 32` avant de déployer."
    );
  }

  return env.NEXTAUTH_SECRET;
}
