import { Resend } from "resend";

type EnvLike = {
  NODE_ENV?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

type PasswordResetLink = {
  email: string;
  resetUrl: string;
};

const DEFAULT_FROM = "Takwria TN <onboarding@resend.dev>";

/**
 * Deliver a password-reset link.
 *
 * Outside production, the link is logged to the console (see the spec) — no
 * e-mail provider needed for local dev. In production, the link is
 * deliberately NEVER logged under any circumstance — a reset URL in a log
 * sink is a working account takeover for anyone who can read logs — and is
 * instead sent via Resend when `RESEND_API_KEY` is configured, or the
 * misconfiguration is reported loudly (without the link) if it isn't.
 *
 * Awaited by its caller (not fire-and-forget): on a serverless platform the
 * function can be frozen the instant a response is returned, so unawaited
 * background work here would risk never completing.
 */
export async function deliverPasswordResetLink(
  { email, resetUrl }: PasswordResetLink,
  env: EnvLike = process.env
): Promise<void> {
  if (env.NODE_ENV !== "production") {
    console.log(`[reset-password] lien pour ${email} : ${resetUrl}`);
    return;
  }

  if (!env.RESEND_API_KEY) {
    console.error(
      "[reset-password] AUCUN fournisseur d'e-mail configuré : impossible " +
        "d'envoyer le lien de réinitialisation. Le lien n'est volontairement " +
        "pas journalisé. Configurez RESEND_API_KEY avant la mise en production."
    );
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM ?? DEFAULT_FROM,
      to: email,
      subject: "Réinitialisez votre mot de passe — Takwria TN",
      html: `
        <p>Vous avez demandé la réinitialisation de votre mot de passe sur Takwria TN.</p>
        <p><a href="${resetUrl}">Cliquez ici pour choisir un nouveau mot de passe</a></p>
        <p>Ce lien expire dans une heure. Si vous n'êtes pas à l'origine de cette
        demande, vous pouvez ignorer cet e-mail sans risque.</p>
      `,
    });

    // Never log the link itself here, even on failure — the whole point of
    // this function is that the link only ever reaches the recipient's inbox.
    if (error) {
      console.error(`[reset-password] échec de l'envoi via Resend : ${error.message}`);
    }
  } catch (err) {
    console.error(
      `[reset-password] échec de l'envoi via Resend : ${
        err instanceof Error ? err.message : "erreur inconnue"
      }`
    );
  }
}
