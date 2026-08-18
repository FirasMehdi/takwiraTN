import { z } from "zod";

export const profilSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis"),
  ville: z.string().min(1, "La ville est requise"),
  poste: z.enum(["gardien", "defenseur", "milieu", "attaquant"]).optional(),
  niveau: z.enum(["debutant", "intermediaire", "avance"]).optional(),
  piedPrefere: z.enum(["gauche", "droit", "ambidextre"]).optional(),
  telephone: z.string().optional(),
  bio: z.string().max(500, "La bio ne peut pas dépasser 500 caractères").optional(),
});

export type ProfilInput = z.infer<typeof profilSchema>;
