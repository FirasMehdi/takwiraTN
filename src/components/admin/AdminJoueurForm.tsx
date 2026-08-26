"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  prenom: string;
  ville: string;
  poste: string | null;
  niveau: string | null;
  piedPrefere: string | null;
  telephone: string | null;
  bio: string | null;
};

export function AdminJoueurForm({ joueurId, profile }: { joueurId: string; profile: Profile }) {
  const router = useRouter();
  const [prenom, setPrenom] = useState(profile.prenom);
  const [ville, setVille] = useState(profile.ville);
  const [poste, setPoste] = useState(profile.poste ?? "");
  const [niveau, setNiveau] = useState(profile.niveau ?? "");
  const [piedPrefere, setPiedPrefere] = useState(profile.piedPrefere ?? "");
  const [telephone, setTelephone] = useState(profile.telephone ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/joueurs/${joueurId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom,
          ville,
          poste: poste || null,
          niveau: niveau || null,
          piedPrefere: piedPrefere || null,
          telephone: telephone || null,
          bio: bio || null,
        }),
      });

      if (!response.ok) {
        try {
          const body = await response.json();
          setErrors(body.error ?? {});
        } catch {
          setError("Une erreur est survenue. Veuillez réessayer.");
        }
        return;
      }

      setMessage("Profil du joueur mis à jour.");
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="prenom" className="block text-sm font-medium">Prénom</label>
        <input
          id="prenom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.prenom && <p className="mt-1 text-sm text-red-600">{errors.prenom[0]}</p>}
      </div>
      <div>
        <label htmlFor="ville" className="block text-sm font-medium">Ville</label>
        <input
          id="ville"
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          required
        />
        {errors.ville && <p className="mt-1 text-sm text-red-600">{errors.ville[0]}</p>}
      </div>
      <div>
        <label htmlFor="poste" className="block text-sm font-medium">Poste</label>
        <select
          id="poste"
          value={poste}
          onChange={(e) => setPoste(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Non renseigné</option>
          <option value="gardien">Gardien</option>
          <option value="defenseur">Défenseur</option>
          <option value="milieu">Milieu</option>
          <option value="attaquant">Attaquant</option>
        </select>
      </div>
      <div>
        <label htmlFor="niveau" className="block text-sm font-medium">Niveau</label>
        <select
          id="niveau"
          value={niveau}
          onChange={(e) => setNiveau(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Non renseigné</option>
          <option value="debutant">Débutant</option>
          <option value="intermediaire">Intermédiaire</option>
          <option value="avance">Avancé</option>
        </select>
      </div>
      <div>
        <label htmlFor="piedPrefere" className="block text-sm font-medium">Pied préféré</label>
        <select
          id="piedPrefere"
          value={piedPrefere}
          onChange={(e) => setPiedPrefere(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="">Non renseigné</option>
          <option value="gauche">Gauche</option>
          <option value="droit">Droit</option>
          <option value="ambidextre">Ambidextre</option>
        </select>
      </div>
      <div>
        <label htmlFor="telephone" className="block text-sm font-medium">Téléphone</label>
        <input
          id="telephone"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="bio" className="block text-sm font-medium">Présentation</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          rows={3}
          maxLength={500}
        />
        {errors.bio && <p className="mt-1 text-sm text-red-600">{errors.bio[0]}</p>}
      </div>
      {message && <p className="text-sm text-primary">{message}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {submitting ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
