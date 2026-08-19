"use client";

import { signOut } from "next-auth/react";

export function DeconnexionButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg border border-anthracite px-4 py-3 font-semibold text-anthracite hover:bg-anthracite/5"
    >
      Se déconnecter
    </button>
  );
}
