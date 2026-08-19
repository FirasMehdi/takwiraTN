import { z } from "zod";

export const profilSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis"),
  ville: z.string().min(1, "La ville est requise"),
  poste: z.enum(["gardien", "defenseur", "milieu", "attaquant"]).nullish(),
  niveau: z.enum(["debutant", "intermediaire", "avance"]).nullish(),
  piedPrefere: z.enum(["gauche", "droit", "ambidextre"]).nullish(),
  telephone: z.string().nullish(),
  bio: z.string().max(500, "La bio ne peut pas dépasser 500 caractères").nullish(),
});

export type ProfilInput = z.infer<typeof profilSchema>;
