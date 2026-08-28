"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AdminRecherche({
  basePath,
  valeur,
  placeholder,
}: {
  basePath: string;
  valeur: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(valeur);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        aria-label="Recherche"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        type="submit"
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
      >
        Rechercher
      </button>
    </form>
  );
}
