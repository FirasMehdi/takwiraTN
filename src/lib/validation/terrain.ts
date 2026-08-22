import { z } from "zod";

/** "YYYY-MM-DD" — interprété en heure locale Africa/Tunis. */
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (format attendu : AAAA-MM-JJ)")
  .refine((valeur) => !Number.isNaN(new Date(`${valeur}T00:00:00`).getTime()), {
    message: "Date invalide",
  });

/** "HH:MM" sur 24 heures. */
const heureSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (format attendu : HH:MM)");

export const formatSchema = z.enum(["cinq", "sept", "onze"], {
  errorMap: () => ({ message: "Format invalide" }),
});

export const terrainListQuerySchema = z.object({
  ville: z.string().trim().min(1).optional(),
  date: dateSchema.optional(),
  heure: heureSchema.optional(),
  format: formatSchema.optional(),
  prixMax: z.coerce
    .number()
    .int("Le prix doit être un entier")
    .nonnegative("Le prix ne peut pas être négatif")
    .optional(),
});

export type TerrainListQuery = z.infer<typeof terrainListQuerySchema>;

export const terrainDetailQuerySchema = z.object({
  date: dateSchema.optional(),
});

export type TerrainDetailQuery = z.infer<typeof terrainDetailQuerySchema>;
