"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { libelleEquipement } from "@/lib/terrains/format";

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const TYPES = [
  { value: "gazon_synthetique", label: "Gazon synthétique" },
  { value: "gazon_naturel", label: "Gazon naturel" },
  { value: "beton", label: "Béton" },
] as const;

const EQUIPEMENTS_DISPONIBLES = ["vestiaires", "douches", "eclairage", "parking", "tribunes", "buvette"] as const;

export type ModifierTerrainFormProps = {
  terrainId: string;
  nom: string;
  description: string | null;
  adresse: string;
  ville: string;
  latitude: number | null;
  longitude: number | null;
  type: (typeof TYPES)[number]["value"];
  dureeCreneauMinutes: number;
  equipements: string[];
};

export function ModifierTerrainForm(props: ModifierTerrainFormProps) {
  const router = useRouter();
  const [nom, setNom] = useState(props.nom);
  const [description, setDescription] = useState(props.description ?? "");
  const [adresse, setAdresse] = useState(props.adresse);
  const [ville, setVille] = useState(props.ville);
  const [latitude, setLatitude] = useState(props.latitude !== null ? String(props.latitude) : "");
  const [longitude, setLongitude] = useState(props.longitude !== null ? String(props.longitude) : "");
  const [type, setType] = useState(props.type);
  const [dureeCreneauMinutes, setDureeCreneauMinutes] = useState(String(props.dureeCreneauMinutes));
  const [equipements, setEquipements] = useState<string[]>(props.equipements);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [succes, setSucces] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function toggleEquipement(valeur: string) {
    setEquipements((prev) =>
      prev.includes(valeur) ? prev.filter((e) => e !== valeur) : [...prev, valeur]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setError("");
    setSucces(false);

    try {
      const response = await fetch(`/api/proprietaire/terrains/${props.terrainId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          description: description || undefined,
          adresse,
          ville,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          type,
          dureeCreneauMinutes: Number(dureeCreneauMinutes),
          equipements,
        }),
      });

      if (!response.ok) {
        try {
          const body = await response.json();
          setErrors(typeof body.error === "object" ? body.error : {});
          if (typeof body.error === "string") setError(body.error);
        } catch {
          setError("Une erreur est survenue. Veuillez réessayer.");
        }
        return;
      }

      setSucces(true);
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
        <label htmlFor="nom" className="block text-sm font-medium text-anthracite">Nom du terrain</label>
        <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} className={champClasse} required />
        {errors.nom && <p className="mt-1 text-sm text-red-600">{errors.nom[0]}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-anthracite">Description (optionnel)</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={champClasse}
          rows={3}
          maxLength={1000}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description[0]}</p>}
      </div>

      <div>
        <label htmlFor="adresse" className="block text-sm font-medium text-anthracite">Adresse</label>
        <input id="adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} className={champClasse} required />
        {errors.adresse && <p className="mt-1 text-sm text-red-600">{errors.adresse[0]}</p>}
      </div>

      <div>
        <label htmlFor="ville" className="block text-sm font-medium text-anthracite">Ville</label>
        <input id="ville" value={ville} onChange={(e) => setVille(e.target.value)} className={champClasse} required />
        {errors.ville && <p className="mt-1 text-sm text-red-600">{errors.ville[0]}</p>}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="latitude" className="block text-sm font-medium text-anthracite">Latitude (optionnel)</label>
          <input
            id="latitude"
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className={champClasse}
          />
          {errors.latitude && <p className="mt-1 text-sm text-red-600">{errors.latitude[0]}</p>}
        </div>
        <div className="flex-1">
          <label htmlFor="longitude" className="block text-sm font-medium text-anthracite">Longitude (optionnel)</label>
          <input
            id="longitude"
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className={champClasse}
          />
          {errors.longitude && <p className="mt-1 text-sm text-red-600">{errors.longitude[0]}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="type" className="block text-sm font-medium text-anthracite">Type de surface</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className={champClasse}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="dureeCreneauMinutes" className="block text-sm font-medium text-anthracite">
            Durée d&apos;un créneau (minutes)
          </label>
          <input
            id="dureeCreneauMinutes"
            type="number"
            min={15}
            max={240}
            value={dureeCreneauMinutes}
            onChange={(e) => setDureeCreneauMinutes(e.target.value)}
            className={champClasse}
          />
          {errors.dureeCreneauMinutes && <p className="mt-1 text-sm text-red-600">{errors.dureeCreneauMinutes[0]}</p>}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-anthracite">Équipements</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {EQUIPEMENTS_DISPONIBLES.map((equipement) => (
            <label key={equipement} className="flex items-center gap-2 text-sm text-anthracite">
              <input
                type="checkbox"
                checked={equipements.includes(equipement)}
                onChange={() => toggleEquipement(equipement)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              {libelleEquipement(equipement)}
            </label>
          ))}
        </div>
      </fieldset>

      {succes && <p className="text-sm text-green-700">Terrain mis à jour.</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
      >
        {submitting ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
