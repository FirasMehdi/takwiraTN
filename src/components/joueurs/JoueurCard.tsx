import Link from "next/link";
import type { JoueurResume } from "@/lib/joueurs/queries";

const POSTES: Record<string, string> = {
  gardien: "Gardien",
  defenseur: "Défenseur",
  milieu: "Milieu",
  attaquant: "Attaquant",
};

const NIVEAUX: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export function JoueurCard({ joueur }: { joueur: JoueurResume }) {
  return (
    <Link
      href={`/joueurs/${joueur.id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      {joueur.photoUrl ? (
        <img
          src={joueur.photoUrl}
          alt={joueur.prenom}
          className="h-12 w-12 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          role="presentation"
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-400"
        >
          {joueur.prenom.charAt(0).toUpperCase()}
        </div>
      )}
      <div>
        <h2 className="font-semibold text-anthracite">{joueur.prenom}</h2>
        <p className="text-sm text-gray-600">
          {joueur.ville}
          {joueur.poste ? ` · ${POSTES[joueur.poste] ?? joueur.poste}` : ""}
          {joueur.niveau ? ` · ${NIVEAUX[joueur.niveau] ?? joueur.niveau}` : ""}
        </p>
      </div>
    </Link>
  );
}
