"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { libelleEquipement, libelleFormat } from "@/lib/terrains/format";

const champClasse =
  "mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const TYPES = [
  { value: "gazon_synthetique", label: "Gazon synthétique" },
  { value: "gazon_naturel", label: "Gazon naturel" },
  { value: "beton", label: "Béton" },
] as const;

const FORMATS = ["quatre", "cinq", "six", "sept", "huit", "neuf", "onze"] as const;

const EQUIPEMENTS_DISPONIBLES = ["vestiaires", "douches", "eclairage", "parking", "tribunes", "buvette"] as const;

const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

type LigneFormat = { format: (typeof FORMATS)[number]; capacite: string; prixDinars: string };
type LigneHoraire = { jourSemaine: number; ouvre: string; ferme: string };

function ligneFormatVide(): LigneFormat {
  return { format: "cinq", capacite: "", prixDinars: "" };
}

function ligneHoraireVide(): LigneHoraire {
  return { jourSemaine: 1, ouvre: "08:00", ferme: "22:00" };
}

export function CreerTerrainForm() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [adresse, setAdresse] = useState("");
  const [ville, setVille] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("gazon_synthetique");
  const [dureeCreneauMinutes, setDureeCreneauMinutes] = useState("90");
  const [equipements, setEquipements] = useState<string[]>([]);
  const [formats, setFormats] = useState<LigneFormat[]>([ligneFormatVide()]);
  const [horaires, setHoraires] = useState<LigneHoraire[]>([ligneHoraireVide()]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleEquipement(valeur: string) {
    setEquipements((prev) =>
      prev.includes(valeur) ? prev.filter((e) => e !== valeur) : [...prev, valeur]
    );
  }

  function majFormat(index: number, champ: keyof LigneFormat, valeur: string) {
    setFormats((prev) =>
      prev.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne))
    );
  }

  function majHoraire(index: number, champ: keyof LigneHoraire, valeur: string | number) {
    setHoraires((prev) =>
      prev.map((ligne, i) => (i === index ? { ...ligne, [champ]: valeur } : ligne))
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setError("");

    try {
      const response = await fetch("/api/proprietaire/terrains", {
        method: "POST",
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
          formats: formats.map((f) => ({
            format: f.format,
            capacite: Number(f.capacite),
            prixParCreneau: Math.round(Number(f.prixDinars) * 1000),
          })),
          horaires: horaires.map((h) => ({
            jourSemaine: h.jourSemaine,
            ouvre: h.ouvre,
            ferme: h.ferme,
          })),
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

      const body = await response.json();
      router.push(`/proprietaire/terrains/${body.id}/modifier`);
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
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

      <fieldset className="rounded-lg border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium text-anthracite">Formats proposés</legend>
        {errors.formats && <p className="mt-1 text-sm text-red-600">{errors.formats[0]}</p>}
        <div className="flex flex-col gap-3">
          {formats.map((ligne, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-2">
              <div>
                <label htmlFor={`format-${index}`} className="block text-xs text-gray-600">Format</label>
                <select
                  id={`format-${index}`}
                  value={ligne.format}
                  onChange={(e) => majFormat(index, "format", e.target.value)}
                  className={champClasse}
                >
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{libelleFormat(f)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`capacite-${index}`} className="block text-xs text-gray-600">Capacité</label>
                <input
                  id={`capacite-${index}`}
                  type="number"
                  min={2}
                  max={30}
                  value={ligne.capacite}
                  onChange={(e) => majFormat(index, "capacite", e.target.value)}
                  className={champClasse}
                  required
                />
              </div>
              <div>
                <label htmlFor={`prix-${index}`} className="block text-xs text-gray-600">Prix / créneau (DT)</label>
                <input
                  id={`prix-${index}`}
                  type="number"
                  min={0}
                  step="0.001"
                  value={ligne.prixDinars}
                  onChange={(e) => majFormat(index, "prixDinars", e.target.value)}
                  className={champClasse}
                  required
                />
              </div>
              {formats.length > 1 && (
                <button
                  type="button"
                  onClick={() => setFormats((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFormats((prev) => [...prev, ligneFormatVide()])}
          className="mt-2 text-sm font-semibold text-primary hover:underline"
        >
          + Ajouter un format
        </button>
      </fieldset>

      <fieldset className="rounded-lg border border-gray-200 p-3">
        <legend className="px-1 text-sm font-medium text-anthracite">Horaires d&apos;ouverture</legend>
        {errors.horaires && <p className="mt-1 text-sm text-red-600">{errors.horaires[0]}</p>}
        <div className="flex flex-col gap-3">
          {horaires.map((ligne, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-2">
              <div>
                <label htmlFor={`jour-${index}`} className="block text-xs text-gray-600">Jour</label>
                <select
                  id={`jour-${index}`}
                  value={ligne.jourSemaine}
                  onChange={(e) => majHoraire(index, "jourSemaine", Number(e.target.value))}
                  className={champClasse}
                >
                  {JOURS.map((jour, i) => (
                    <option key={jour} value={i}>{jour}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`ouvre-${index}`} className="block text-xs text-gray-600">Ouverture</label>
                <input
                  id={`ouvre-${index}`}
                  type="time"
                  value={ligne.ouvre}
                  onChange={(e) => majHoraire(index, "ouvre", e.target.value)}
                  className={champClasse}
                  required
                />
              </div>
              <div>
                <label htmlFor={`ferme-${index}`} className="block text-xs text-gray-600">Fermeture</label>
                <input
                  id={`ferme-${index}`}
                  type="time"
                  value={ligne.ferme}
                  onChange={(e) => majHoraire(index, "ferme", e.target.value)}
                  className={champClasse}
                  required
                />
              </div>
              {horaires.length > 1 && (
                <button
                  type="button"
                  onClick={() => setHoraires((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setHoraires((prev) => [...prev, ligneHoraireVide()])}
          className="mt-2 text-sm font-semibold text-primary hover:underline"
        >
          + Ajouter un horaire
        </button>
      </fieldset>

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
        {submitting ? "Création..." : "Créer le terrain"}
      </button>
    </form>
  );
}
