import { z } from "zod";

export const adminListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "La recherche ne peut pas être vide")
    .max(120, "La recherche est trop longue")
    .optional(),
});

export type AdminListQuery = z.infer<typeof adminListQuerySchema>;

export const adminTerrainStatutSchema = z.object({
  statut: z.enum(["actif", "en_attente", "suspendu"], {
    errorMap: () => ({ message: "Statut invalide" }),
  }),
});

export type AdminTerrainStatutInput = z.infer<typeof adminTerrainStatutSchema>;

export const adminAnnulerMatchSchema = z
  .object({
    raison: z.enum(
      ["personnel", "pas_assez_joueurs", "conflit_horaire", "terrain_indisponible", "autre"],
      { errorMap: () => ({ message: "Raison invalide" }) }
    ),
    raisonAutre: z.string().max(300, "Le motif est trop long").nullish(),
  })
  .refine((data) => data.raison !== "autre" || !!data.raisonAutre?.trim(), {
    message: "Merci de préciser le motif.",
    path: ["raisonAutre"],
  });

export type AdminAnnulerMatchInput = z.infer<typeof adminAnnulerMatchSchema>;
