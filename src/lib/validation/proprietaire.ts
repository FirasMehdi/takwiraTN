import { z } from "zod";
import { formatSchema, heureSchema } from "@/lib/validation/terrain";

export const terrainTypeSchema = z.enum(
  ["gazon_synthetique", "gazon_naturel", "beton"],
  { errorMap: () => ({ message: "Type de terrain invalide" }) }
);

export const jourSemaineSchema = z.coerce
  .number()
  .int("Le jour doit être un entier")
  .min(0, "Jour invalide (0 = dimanche, 6 = samedi)")
  .max(6, "Jour invalide (0 = dimanche, 6 = samedi)");

export const formatOffreSchema = z.object({
  format: formatSchema,
  capacite: z.coerce
    .number()
    .int("La capacité doit être un entier")
    .min(2, "La capacité minimale est 2 joueurs")
    .max(30, "La capacité dépasse la limite autorisée"),
  prixParCreneau: z.coerce
    .number()
    .int("Le prix doit être un entier")
    .min(0, "Le prix ne peut pas être négatif")
    .max(2_147_483_647, "Le prix dépasse la limite autorisée"),
});

export const horaireSchema = z
  .object({
    jourSemaine: jourSemaineSchema,
    ouvre: heureSchema,
    ferme: heureSchema,
  })
  .refine((horaire) => horaire.ouvre < horaire.ferme, {
    message: "L'heure de fermeture doit être après l'heure d'ouverture",
    path: ["ferme"],
  });

export const terrainBaseSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis").max(120, "Le nom est trop long"),
  description: z.string().trim().max(1000, "La description est trop longue").optional(),
  adresse: z.string().trim().min(1, "L'adresse est requise").max(200, "L'adresse est trop longue"),
  ville: z.string().trim().min(1, "La ville est requise").max(80, "Le nom de la ville est trop long"),
  latitude: z.coerce.number().min(-90, "Latitude invalide").max(90, "Latitude invalide").optional(),
  longitude: z.coerce.number().min(-180, "Longitude invalide").max(180, "Longitude invalide").optional(),
  type: terrainTypeSchema,
  dureeCreneauMinutes: z.coerce
    .number()
    .int("La durée doit être un entier")
    .min(15, "La durée minimale est 15 minutes")
    .max(240, "La durée maximale est 240 minutes")
    .optional(),
  equipements: z
    .array(z.string().trim().min(1).max(40))
    .max(15, "Trop d'équipements")
    .optional(),
});

export const creerTerrainSchema = terrainBaseSchema.extend({
  formats: z
    .array(formatOffreSchema)
    .min(1, "Il faut proposer au moins un format avec sa capacité et son prix"),
  horaires: z
    .array(horaireSchema)
    .min(1, "Il faut renseigner au moins un horaire d'ouverture"),
});

export const modifierTerrainSchema = terrainBaseSchema;

export const ajouterFormatSchema = formatOffreSchema;

export const modifierFormatSchema = z.object({
  capacite: formatOffreSchema.shape.capacite,
  prixParCreneau: formatOffreSchema.shape.prixParCreneau,
});

export const modifierHorairesSchema = z.object({
  horaires: z
    .array(horaireSchema)
    .min(1, "Il faut renseigner au moins un horaire d'ouverture"),
});

export type CreerTerrainInput = z.infer<typeof creerTerrainSchema>;
export type ModifierTerrainInput = z.infer<typeof modifierTerrainSchema>;
export type AjouterFormatInput = z.infer<typeof ajouterFormatSchema>;
export type ModifierFormatInput = z.infer<typeof modifierFormatSchema>;
export type ModifierHorairesInput = z.infer<typeof modifierHorairesSchema>;
