"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function InscriptionForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prenom, setPrenom] = useState("");
  const [ville, setVille] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setError("");

    try {
      const response = await fetch("/api/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, prenom, ville }),
      });

      if (!response.ok) {
        try {
          const body = await response.json();
          setErrors(body.error ?? {});
        } catch {
          setError("Une erreur est survenue. Veuillez réessayer.");
        }
        return;
      }

      router.push("/connexion?inscription=reussie");
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <div>
        <label htmlFor="prenom" className="block text-sm font-medium">Prénom</label>
        <input
          id="prenom"
          autoComplete="given-name"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.prenom && <p className="mt-1 text-sm text-red-600">{errors.prenom[0]}</p>}
      </div>
      <div>
        <label htmlFor="ville" className="block text-sm font-medium">Ville</label>
        <input
          id="ville"
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.ville && <p className="mt-1 text-sm text-red-600">{errors.ville[0]}</p>}
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email[0]}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Mot de passe</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password[0]}</p>}
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
        {submitting ? "Création..." : "Créer mon compte"}
      </button>
    </form>
  );
}
