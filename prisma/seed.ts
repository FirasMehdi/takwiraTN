import { PrismaClient, type Prisma } from "@prisma/client";

type Client = PrismaClient | Prisma.TransactionClient;

const TOUS_LES_JOURS = [0, 1, 2, 3, 4, 5, 6];
const SAUF_VENDREDI = [0, 1, 2, 3, 4, 6];

function horaires(jours: number[], ouvre: string, ferme: string) {
  return jours.map((jourSemaine) => ({ jourSemaine, ouvre, ferme }));
}

const TERRAINS = [
  {
    nom: "Complexe El Menzah",
    description:
      "Terrain de proximité au cœur d'El Menzah, éclairé et accessible en soirée.",
    adresse: "Rue de Rome, El Menzah",
    ville: "Tunis",
    latitude: 36.8382,
    longitude: 10.1712,
    type: "gazon_synthetique" as const,
    format: "cinq" as const,
    prixParCreneau: 60000,
    dureeCreneauMinutes: 90,
    equipements: ["vestiaires", "douches", "eclairage", "parking"],
    horaires: horaires(TOUS_LES_JOURS, "08:00", "23:00"),
  },
  {
    nom: "Stade Municipal d'Ariana",
    description: "Grand terrain en gazon naturel, idéal pour les matchs à 11.",
    adresse: "Avenue Habib Bourguiba, Ariana",
    ville: "Ariana",
    latitude: 36.8625,
    longitude: 10.1956,
    type: "gazon_naturel" as const,
    format: "onze" as const,
    prixParCreneau: 120000,
    dureeCreneauMinutes: 90,
    equipements: ["vestiaires", "douches", "tribunes"],
    // Fermé le vendredi — exerce la règle « aucun horaire = terrain fermé ».
    horaires: horaires(SAUF_VENDREDI, "09:00", "21:00"),
  },
  {
    nom: "Sfax Foot Center",
    description: "Deux terrains synthétiques couverts, ouverts toute l'année.",
    adresse: "Route de Gremda km 3",
    ville: "Sfax",
    latitude: 34.7714,
    longitude: 10.7605,
    type: "gazon_synthetique" as const,
    format: "sept" as const,
    prixParCreneau: 80000,
    dureeCreneauMinutes: 60,
    equipements: ["vestiaires", "eclairage", "buvette"],
    horaires: horaires(TOUS_LES_JOURS, "10:00", "00:00"),
  },
  {
    nom: "Sousse Beach Arena",
    description: "Terrain en béton en bord de mer, tarif accessible.",
    adresse: "Boulevard de la Corniche",
    ville: "Sousse",
    latitude: 35.8256,
    longitude: 10.6369,
    type: "beton" as const,
    format: "cinq" as const,
    prixParCreneau: 40000,
    dureeCreneauMinutes: 60,
    equipements: ["eclairage"],
    horaires: [
      // Horaires coupés : matin puis soirée.
      ...horaires(TOUS_LES_JOURS, "08:00", "12:00"),
      ...horaires(TOUS_LES_JOURS, "16:00", "22:00"),
    ],
  },
];

/**
 * Insère les terrains de démonstration. Idempotent : un terrain déjà présent
 * (même nom, même ville) est ignoré, pour que le script puisse être relancé.
 */
export async function seedTerrains(client: Client): Promise<void> {
  for (const { horaires: h, ...terrain } of TERRAINS) {
    const existant = await client.terrain.findFirst({
      where: { nom: terrain.nom, ville: terrain.ville },
      select: { id: true },
    });

    if (existant) continue;

    await client.terrain.create({
      data: { ...terrain, photos: [], horaires: { create: h } },
    });
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedTerrains(prisma);
    console.log("Terrains de démonstration insérés.");
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuté seulement en ligne de commande, jamais à l'import depuis les tests.
if (process.argv[1]?.includes("seed")) {
  main();
}
