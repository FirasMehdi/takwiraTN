"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/joueurs", label: "Joueurs" },
  { href: "/admin/proprietaires", label: "Propriétaires" },
  { href: "/admin/terrains", label: "Terrains" },
  { href: "/admin/matchs", label: "Matchs" },
  { href: "/admin/annulations", label: "Annulations" },
  { href: "/admin/profil", label: "Mon profil" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2">
      {LIENS.map((lien) => {
        const actif = lien.href === "/admin" ? pathname === "/admin" : pathname.startsWith(lien.href);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition ${
              actif ? "bg-primary/10 font-semibold text-primary" : "text-anthracite/70 hover:text-anthracite"
            }`}
          >
            {lien.label}
          </Link>
        );
      })}
    </nav>
  );
}
