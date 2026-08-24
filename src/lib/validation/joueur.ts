import { z } from "zod";

export const joueurListQuerySchema = z.object({
  ville: z
    .string()
    .trim()
    .min(1, "La ville ne peut pas être vide")
    .max(80, "Le nom de la ville est trop long")
    .optional(),
  poste: z
    .enum(["gardien", "defenseur", "milieu", "attaquant"], {
      errorMap: () => ({ message: "Poste invalide" }),
    })
    .optional(),
});

export type JoueurListQuery = z.infer<typeof joueurListQuerySchema>;
