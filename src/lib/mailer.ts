type EnvLike = { NODE_ENV?: string };

type PasswordResetLink = {
  email: string;
  resetUrl: string;
};

/**
 * Deliver a password-reset link.
 *
 * No e-mail provider is wired up yet (see the spec: reset links are logged to
 * the console in dev). The production branch deliberately refuses to log the
 * link — a reset URL in a log sink is a working account takeover for anyone
 * who can read logs — and instead reports the misconfiguration.
 */
export function deliverPasswordResetLink(
  { email, resetUrl }: PasswordResetLink,
  env: EnvLike = process.env
): void {
  if (env.NODE_ENV === "production") {
    console.error(
      "[reset-password] AUCUN fournisseur d'e-mail configuré : impossible " +
        "d'envoyer le lien de réinitialisation. Le lien n'est volontairement " +
        "pas journalisé. Configurez un fournisseur d'e-mail avant la mise en production."
    );
    return;
  }

  console.log(`[reset-password] lien pour ${email} : ${resetUrl}`);
}
