"use client";

import { useState } from "react";

type Ami = { id: string; prenom: string };

export function InviterAmiButton({
  matchUrl,
  amisDisponibles,
}: {
  matchUrl: string;
  amisDisponibles: Ami[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [envoiId, setEnvoiId] = useState<string | null>(null);
  const [envoyesA, setEnvoyesA] = useState<Set<string>>(new Set());

  async function inviter(amiId: string) {
    setEnvoiId(amiId);
    try {
      const response = await fetch(`/api/messages/${amiId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contenu: `Je t'invite à rejoindre mon match, il manque des joueurs : ${matchUrl}`,
        }),
      });
      if (response.ok) {
        setEnvoyesA((prev) => new Set(prev).add(amiId));
      }
    } finally {
      setEnvoiId(null);
    }
  }

  if (amisDisponibles.length === 0) {
    return null;
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-anthracite hover:bg-gray-50"
      >
        Inviter un ami
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="text-sm font-medium text-anthracite">Inviter un ami</p>
      <ul className="mt-2 flex flex-col gap-1">
        {amisDisponibles.map((ami) => (
          <li key={ami.id} className="flex items-center justify-between">
            <span className="text-sm text-anthracite">{ami.prenom}</span>
            {envoyesA.has(ami.id) ? (
              <span className="text-xs text-gray-500">Invité</span>
            ) : (
              <button
                type="button"
                onClick={() => inviter(ami.id)}
                disabled={envoiId === ami.id}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
              >
                {envoiId === ami.id ? "..." : "Inviter"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
