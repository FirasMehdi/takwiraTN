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
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-gray-200 bg-white py-2">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`text-sm ${pathname === item.href ? "font-semibold text-primary" : "text-anthracite"}`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
