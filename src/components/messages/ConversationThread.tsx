"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Message = { id: string; expediteurId: string; contenu: string; createdAt: string };

export function ConversationThread({
  autreUserId,
  moiId,
  messages,
}: {
  autreUserId: string;
  moiId: string;
  messages: Message[];
}) {
  const router = useRouter();
  const [contenu, setContenu] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!contenu.trim()) return;
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/messages/${autreUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu }),
      });
      if (!response.ok) {
        setErreur("Impossible d'envoyer ce message.");
        return;
      }
      setContenu("");
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
              m.expediteurId === moiId
                ? "self-end bg-primary text-white"
                : "self-start bg-gray-100 text-anthracite"
            }`}
          >
            {m.contenu}
          </li>
        ))}
      </ul>

      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={envoi || !contenu.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
