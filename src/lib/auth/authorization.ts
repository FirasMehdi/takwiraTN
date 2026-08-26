import type { Session } from "next-auth";

export type RequireRoleResultat =
  | { ok: true }
  | { ok: false; statut: 401 | 403; erreur: string };

/**
 * Vérifie qu'une session existe et correspond au rôle attendu. Le middleware
 * (`src/middleware.ts`) ne peut pas faire cette vérification lui-même —
 * `getToken()` décode le JWT sans requête base et ne peut donc pas être
 * tenu à jour si le rôle change — donc chaque page et chaque route protégée
 * par rôle doit appeler cette fonction elle-même, exactement comme
 * `getServerSession` est déjà utilisé pour vérifier l'authentification
 * simple ailleurs dans l'application (voir docs/pre-production-checklist.md
 * § 5 pour le même trou documenté côté session).
 */
export function requireRole(session: Session | null, role: string): RequireRoleResultat {
  if (!session?.user) {
    return { ok: false, statut: 401, erreur: "Non authentifié" };
  }
  if (session.user.role !== role) {
    return { ok: false, statut: 403, erreur: "Accès refusé" };
  }
  return { ok: true };
}
