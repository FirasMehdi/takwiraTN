"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ReinitialiserMotDePasseForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/reinitialiser-mot-de-passe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const body = await response.json();
      setError(body.error?.token?.[0] ?? "Une erreur est survenue.");
      return;
    }

    router.push("/connexion?reinitialisation=reussie");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Nouveau mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Enregistrement..." : "Réinitialiser"}
      </button>
    </form>
  );
}
