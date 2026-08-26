import { describe, it, expect } from "vitest";
import { requireRole } from "@/lib/auth/authorization";
import type { Session } from "next-auth";

function sessionAvecRole(role: string): Session {
  return {
    user: { id: "u1", role, email: "u1@test.com" },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

describe("requireRole", () => {
  it("rejects with 401 when there is no session", () => {
    const resultat = requireRole(null, "administrateur");
    expect(resultat).toEqual({ ok: false, statut: 401, erreur: "Non authentifié" });
  });

  it("rejects with 403 when the session's role doesn't match", () => {
    const resultat = requireRole(sessionAvecRole("joueur"), "administrateur");
    expect(resultat).toEqual({ ok: false, statut: 403, erreur: "Accès refusé" });
  });

  it("accepts when the session's role matches exactly", () => {
    const resultat = requireRole(sessionAvecRole("administrateur"), "administrateur");
    expect(resultat).toEqual({ ok: true });
  });

  it("rejects a proprietaire session requiring administrateur", () => {
    const resultat = requireRole(sessionAvecRole("proprietaire"), "administrateur");
    expect(resultat.ok).toBe(false);
  });
});
