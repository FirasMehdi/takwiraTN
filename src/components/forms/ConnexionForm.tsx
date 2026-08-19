"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

// Only honor same-origin relative paths as a post-login redirect target.
// Anything else (absolute URLs, protocol-relative "//evil.com", or the
// "/\evil.com" variant some browsers normalize to "//evil.com") is an
// open-redirect vector and falls back to the default destination.
export function safeCallbackUrl(raw: string | null): string {
  if (!raw) return "/tableau-de-bord";
  if (!raw.startsWith("/")) return "/tableau-de-bord";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/tableau-de-bord";
  return raw;
}

export function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const result = await signIn("credentials", { email, password, redirect: false });

      if (result?.error) {
        setError("Identifiants invalides");
        return;
      }

      router.push(safeCallbackUrl(searchParams?.get("callbackUrl") ?? null));
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
