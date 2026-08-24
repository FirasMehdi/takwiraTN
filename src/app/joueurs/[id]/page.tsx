import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findJoueurById } from "@/lib/joueurs/queries";
import { statutRelation } from "@/lib/amis/queries";
import { AjouterAmiButton } from "@/components/amis/AjouterAmiButton";

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

const PIEDS: Record<string, string> = {
  gauche: "Gauche",
  droit: "Droit",
  ambidextre: "Ambidextre",
};

export default async function JoueurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  const { id } = await params;
  const joueur = await findJoueurById(id);
  if (!joueur) notFound();

  const estSoiMeme = session.user.id === joueur.id;
  const relation = estSoiMeme ? null : await statutRelation(session.user.id, joueur.id);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 pb-6 pt-6">
      <Link href="/joueurs" className="text-sm text-primary hover:underline">
        ← Retour aux joueurs
      </Link>

      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          {joueur.photoUrl ? (
            <img
              src={joueur.photoUrl}
              alt={joueur.prenom}
              className="h-16 w-16 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              role="presentation"
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl font-bold text-gray-400"
            >
              {joueur.prenom.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold text-anthracite">{joueur.prenom}</h1>
            <p className="text-sm text-gray-600">{joueur.ville}</p>
          </div>
        </div>

        {relation && (
          <div className="mt-4">
            <AjouterAmiButton destinataireId={joueur.id} statutInitial={relation} />
          </div>
        )}

        {joueur.bio && <p className="mt-4 text-sm text-anthracite">{joueur.bio}</p>}

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-600">Poste</dt>
            <dd className="font-medium text-anthracite">
              {joueur.poste ? POSTES[joueur.poste] ?? joueur.poste : "Non renseigné"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600">Niveau</dt>
            <dd className="font-medium text-anthracite">
              {joueur.niveau ? NIVEAUX[joueur.niveau] ?? joueur.niveau : "Non renseigné"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600">Pied préféré</dt>
            <dd className="font-medium text-anthracite">
              {joueur.piedPrefere ? PIEDS[joueur.piedPrefere] ?? joueur.piedPrefere : "Non renseigné"}
            </dd>
          </div>
        </dl>
      </div>
    </main>
  );
}
