"use client";

import { useState, type FormEvent } from "react";

export function MotDePasseOublieForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    const response = await fetch("/api/mot-de-passe-oublie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSubmitting(false);
    const body = await response.json();
    setMessage(body.message ?? "Si ce compte existe, un e-mail a été envoyé.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
      </div>
      {message && <p className="text-sm text-primary">{message}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Envoi..." : "Envoyer le lien"}
      </button>
    </form>
  );
}
