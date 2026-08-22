/** Les prix sont stockés en millimes : 1 dinar = 1000 millimes. */
export function formatPrix(millimes: number): string {
  const dinars = Math.floor(millimes / 1000);
  const reste = String(millimes % 1000).padStart(3, "0");
  return `${dinars},${reste} DT`;
}

const FORMATS: Record<string, string> = {
  cinq: "5 contre 5",
  sept: "7 contre 7",
  onze: "11 contre 11",
};

export function libelleFormat(format: string): string {
  return FORMATS[format] ?? format;
}

const TYPES: Record<string, string> = {
  gazon_synthetique: "Gazon synthétique",
  gazon_naturel: "Gazon naturel",
  beton: "Béton",
};

export function libelleType(type: string): string {
  return TYPES[type] ?? type;
}

const EQUIPEMENTS: Record<string, string> = {
  vestiaires: "Vestiaires",
  douches: "Douches",
  eclairage: "Éclairage",
  parking: "Parking",
  tribunes: "Tribunes",
  buvette: "Buvette",
};

export function libelleEquipement(equipement: string): string {
  return EQUIPEMENTS[equipement] ?? equipement;
}
