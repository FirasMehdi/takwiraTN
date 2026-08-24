import { describe, it, expect } from "vitest";
import { PLACEHOLDER_AUTH_SECRET, resolveAuthSecret } from "@/lib/env";

describe("resolveAuthSecret", () => {
  it("returns the secret when a real value is set in production", () => {
    const secret = resolveAuthSecret({
      NEXTAUTH_SECRET: "un-vrai-secret-genere-aleatoirement",
      NODE_ENV: "production",
    });
    expect(secret).toBe("un-vrai-secret-genere-aleatoirement");
  });

  it("throws in production when the secret is missing", () => {
    expect(() => resolveAuthSecret({ NODE_ENV: "production" })).toThrow(
      /NEXTAUTH_SECRET/
    );
  });

  it("throws in production when the secret is still the placeholder", () => {
    expect(() =>
      resolveAuthSecret({
        NEXTAUTH_SECRET: PLACEHOLDER_AUTH_SECRET,
        NODE_ENV: "production",
      })
    ).toThrow(/NEXTAUTH_SECRET/);
  });

  it("throws in production when the secret is only whitespace", () => {
    expect(() =>
      resolveAuthSecret({ NEXTAUTH_SECRET: "   ", NODE_ENV: "production" })
    ).toThrow(/NEXTAUTH_SECRET/);
  });

  it("throws in production when the secret is shorter than 32 characters", () => {
    expect(() =>
      resolveAuthSecret({ NEXTAUTH_SECRET: "short", NODE_ENV: "production" })
    ).toThrow(/NEXTAUTH_SECRET/);
  });

  it("allows the placeholder outside production", () => {
    const secret = resolveAuthSecret({
      NEXTAUTH_SECRET: PLACEHOLDER_AUTH_SECRET,
      NODE_ENV: "development",
    });
    expect(secret).toBe(PLACEHOLDER_AUTH_SECRET);
  });

  it("allows a missing secret outside production", () => {
    expect(() => resolveAuthSecret({ NODE_ENV: "development" })).not.toThrow();
  });

  it("allows the placeholder during a production build", () => {
    // `next build` runs with NODE_ENV=production, but the real secret is
    // supplied at runtime — refusing to build would break CI for no gain.
    expect(() =>
      resolveAuthSecret({
        NEXTAUTH_SECRET: PLACEHOLDER_AUTH_SECRET,
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      })
    ).not.toThrow();
  });

  it("still throws when the production server starts", () => {
    expect(() =>
      resolveAuthSecret({
        NEXTAUTH_SECRET: PLACEHOLDER_AUTH_SECRET,
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-server",
      })
    ).toThrow(/NEXTAUTH_SECRET/);
  });
});
