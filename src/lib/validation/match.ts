import { z } from "zod";
import { dateSchema, heureSchema } from "@/lib/validation/terrain";

export const matchListQuerySchema = z.object({
  date: dateSchema.optional(),
  ville: z.string().trim().min(1, "La ville ne peut pas être vide").max(80, "Le nom de la ville est trop long").optional(),
});

export const creerMatchSchema = z.object({
  terrainId: z.string().min(1, "Le terrain est requis"),
  date: dateSchema,
  heureDebut: heureSchema,
  heureFin: heureSchema,
  joueursMax: z.coerce
    .number()
    .int("Le nombre de joueurs doit être un entier")
    .min(2, "Il faut au moins 2 joueurs")
    .max(30, "Trop de joueurs pour un seul match"),
  description: z.string().trim().max(500, "La description est trop longue").optional(),
});

export type CreerMatchInput = z.infer<typeof creerMatchSchema>;
export type MatchListQuery = z.infer<typeof matchListQuerySchema>;
