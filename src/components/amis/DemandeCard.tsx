"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DemandeCard({ id, prenom }: { id: string; prenom: string }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState<"accepter" | "refuser" | null>(null);

  async function repondre(action: "accepter" | "refuser") {
    setEnvoi(action);
    try {
      await fetch(`/api/amis/${id}/${action}`, { method: "POST" });
      router.refresh();
    } finally {
      setEnvoi(null);
    }
  }

  return (
    <li className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <span className="text-sm font-medium text-anthracite">{prenom}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => repondre("accepter")}
          disabled={envoi !== null}
          className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {envoi === "accepter" ? "..." : "Accepter"}
        </button>
        <button
          type="button"
          onClick={() => repondre("refuser")}
          disabled={envoi !== null}
          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-anthracite disabled:opacity-50"
        >
          {envoi === "refuser" ? "..." : "Refuser"}
        </button>
      </div>
    </li>
  );
}
