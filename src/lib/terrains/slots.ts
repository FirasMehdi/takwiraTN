export type Slot = {
  /** Heure locale Africa/Tunis, format "HH:MM". */
  debut: string;
  fin: string;
  disponible: boolean;
};

export type Horaire = {
  /** 0 = dimanche … 6 = samedi. */
  jourSemaine: number;
  ouvre: string;
  ferme: string;
};

export type GenerateSlotsInput = {
  horaires: Horaire[];
  date: Date;
  dureeCreneauMinutes: number;
  /** Heures de début déjà réservées ("HH:MM"). Vide tant que la réservation
   *  n'existe pas (sous-projet 3). */
  taken?: string[];
  /** Injecté plutôt que `new Date()` pour rendre le filtrage du passé testable. */
  maintenant?: Date;
};

function toMinutes(hhmm: string): number {
  const [heures, minutes] = hhmm.split(":").map(Number);
  return heures * 60 + minutes;
}

function toHhMm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Minuit local, pour comparer des jours sans que l'heure interfère. */
function debutDeJournee(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function generateSlots({
  horaires,
  date,
  dureeCreneauMinutes,
  taken = [],
  maintenant = new Date(),
}: GenerateSlotsInput): Slot[] {
  // Une durée nulle ou négative ferait boucler la génération indéfiniment.
  if (dureeCreneauMinutes <= 0) return [];

  const jourDemande = debutDeJournee(date);
  const jourActuel = debutDeJournee(maintenant);
  if (jourDemande < jourActuel) return [];

  const horairesDuJour = horaires
    .filter((h) => h.jourSemaine === date.getDay())
    .sort((a, b) => toMinutes(a.ouvre) - toMinutes(b.ouvre));

  if (horairesDuJour.length === 0) return [];

  const estAujourdhui = jourDemande === jourActuel;
  const minutesMaintenant = maintenant.getHours() * 60 + maintenant.getMinutes();
  const reserves = new Set(taken);

  const slots: Slot[] = [];

  for (const horaire of horairesDuJour) {
    const ouvre = toMinutes(horaire.ouvre);
    const ferme = toMinutes(horaire.ferme);

    // Un créneau qui dépasserait l'heure de fermeture n'est pas proposé.
    for (let debut = ouvre; debut + dureeCreneauMinutes <= ferme; debut += dureeCreneauMinutes) {
      if (estAujourdhui && debut <= minutesMaintenant) continue;

      const debutStr = toHhMm(debut);
      slots.push({
        debut: debutStr,
        fin: toHhMm(debut + dureeCreneauMinutes),
        disponible: !reserves.has(debutStr),
      });
    }
  }

  const vus = new Set<string>();
  const dedupliques: Slot[] = [];
  for (const slot of slots) {
    if (vus.has(slot.debut)) continue;
    vus.add(slot.debut);
    dedupliques.push(slot);
  }

  return dedupliques;
}
