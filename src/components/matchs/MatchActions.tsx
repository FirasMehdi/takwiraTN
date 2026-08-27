"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { RAISONS_ANNULATION } from "@/lib/annulations/libelles";

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function MatchActions({
  matchId,
  statut,
  estOrganisateur,
  estInscrit,
}: {
  matchId: string;
  statut: "ouvert" | "complet" | "annule";
  estOrganisateur: boolean;
  estInscrit: boolean;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [formulaireAnnulation, setFormulaireAnnulation] = useState(false);
  // Pas de motif présélectionné : le motif est obligatoire, et présélectionner
  // le premier de la liste laisserait un organisateur qui clique sans
  // réfléchir attribuer silencieusement un motif qu'il n'a jamais choisi.
  const [raison, setRaison] = useState<string>("");
  const [raisonAutre, setRaisonAutre] = useState("");

  async function appeler(url: string, corps?: unknown) {
    if (status !== "authenticated") {
      router.push(`/connexion?callbackUrl=${encodeURIComponent(`/matchs/${matchId}`)}`);
      return;
    }
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(url, {
        method: "POST",
        ...(corps === undefined
          ? {}
          : {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(corps),
            }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setErreur(typeof body?.error === "string" ? body.error : "Une erreur est survenue.");
        return;
      }
      setFormulaireAnnulation(false);
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  function confirmerAnnulation() {
    // Le motif est obligatoire côté serveur : on l'envoie toujours, et la
    // précision libre uniquement quand le motif est « autre ».
    void appeler(`/api/matchs/${matchId}/annuler`, {
      raison,
      ...(raison === "autre" ? { raisonAutre } : {}),
    });
  }

  if (statut === "annule") {
    return <p className="text-sm text-gray-500">Ce match a été annulé.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}
      <div className="flex gap-2">
        {estInscrit ? (
          <button
            type="button"
            onClick={() => appeler(`/api/matchs/${matchId}/quitter`)}
            disabled={envoi}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Quitter le match
          </button>
        ) : (
          <button
            type="button"
            onClick={() => appeler(`/api/matchs/${matchId}/rejoindre`)}
            disabled={envoi || statut === "complet"}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
          >
            {statut === "complet" ? "Match complet" : "Rejoindre le match"}
          </button>
        )}
        {estOrganisateur && !formulaireAnnulation && (
          <button
            type="button"
            onClick={() => setFormulaireAnnulation(true)}
            disabled={envoi}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-anthracite disabled:opacity-50"
          >
            Annuler le match
          </button>
        )}
      </div>

      {estOrganisateur && formulaireAnnulation && (
        <div className="rounded-lg border border-gray-200 p-3">
          <label htmlFor="raison-annulation" className="block text-sm font-medium text-anthracite">
            Motif de l&apos;annulation
          </label>
          <select
            id="raison-annulation"
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            className={champClasse}
          >
            <option value="" disabled>
              Choisissez un motif
            </option>
            {RAISONS_ANNULATION.map((option) => (
              <option key={option.valeur} value={option.valeur}>
                {option.libelle}
              </option>
            ))}
          </select>

          {raison === "autre" && (
            <div className="mt-2">
              <label htmlFor="raison-autre" className="block text-sm font-medium text-anthracite">
                Précisez le motif
              </label>
              <input
                id="raison-autre"
                type="text"
                value={raisonAutre}
                onChange={(e) => setRaisonAutre(e.target.value)}
                maxLength={200}
                className={champClasse}
              />
            </div>
          )}

          <p className="mt-2 text-sm text-gray-600">
            Les autres participants seront prévenus du motif.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmerAnnulation}
              disabled={envoi || raison === ""}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Confirmer l&apos;annulation
            </button>
            <button
              type="button"
              onClick={() => {
                setFormulaireAnnulation(false);
                setErreur("");
              }}
              disabled={envoi}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-anthracite disabled:opacity-50"
            >
              Revenir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
