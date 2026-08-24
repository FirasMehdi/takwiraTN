import { z } from "zod";

export const profilSchema = z.object({
  prenom: z.string().min(1, "Le prénom est requis").max(80, "Le prénom est trop long"),
  ville: z.string().min(1, "La ville est requise").max(80, "Le nom de la ville est trop long"),
  poste: z.enum(["gardien", "defenseur", "milieu", "attaquant"]).nullish(),
  niveau: z.enum(["debutant", "intermediaire", "avance"]).nullish(),
  piedPrefere: z.enum(["gauche", "droit", "ambidextre"]).nullish(),
  telephone: z.string().max(20, "Le numéro de téléphone est trop long").nullish(),
  bio: z.string().max(500, "La bio ne peut pas dépasser 500 caractères").nullish(),
});

export type ProfilInput = z.infer<typeof profilSchema>;
