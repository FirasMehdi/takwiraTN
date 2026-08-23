"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const links = [
  { href: "/", label: "Accueil" },
  { href: "/terrains", label: "Terrains" },
  { href: "/matchs", label: "Matchs" },
  { href: "/joueurs", label: "Joueurs" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { status } = useSession();
  const profilHref = status === "authenticated" ? "/profil" : "/connexion";

  const items = [...links, { href: profilHref, label: "Profil" }];

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-gray-200 bg-white py-2.5 shadow-[0_-1px_6px_rgba(0,0,0,0.04)]">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`rounded-md px-2 py-1 text-sm transition ${
            pathname === item.href
              ? "font-semibold text-primary"
              : "text-anthracite/70 hover:text-anthracite"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
