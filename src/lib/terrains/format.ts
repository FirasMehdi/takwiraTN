import type { FormatEquipe, TerrainType } from "@prisma/client";

/** Les prix sont stockés en millimes : 1 dinar = 1000 millimes. */
export function formatPrix(millimes: number): string {
  const signe = millimes < 0 ? "-" : "";
  const abs = Math.abs(millimes);
  const dinars = Math.floor(abs / 1000);
  const reste = String(abs % 1000).padStart(3, "0");
  return `${signe}${dinars},${reste} DT`;
}

const FORMATS: Record<FormatEquipe, string> = {
  quatre: "4 contre 4",
  cinq: "5 contre 5",
  six: "6 contre 6",
  sept: "7 contre 7",
  huit: "8 contre 8",
  neuf: "9 contre 9",
  onze: "11 contre 11",
};

export function libelleFormat(format: FormatEquipe): string {
  return FORMATS[format] ?? format;
}

const TYPES: Record<TerrainType, string> = {
  gazon_synthetique: "Gazon synthétique",
  gazon_naturel: "Gazon naturel",
  beton: "Béton",
};

export function libelleType(type: TerrainType): string {
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
