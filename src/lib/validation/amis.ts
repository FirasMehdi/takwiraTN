import { z } from "zod";

export const envoyerDemandeSchema = z.object({
  destinataireId: z.string().min(1, "Le destinataire est requis"),
});

export const envoyerMessageSchema = z.object({
  contenu: z
    .string()
    .trim()
    .min(1, "Le message ne peut pas être vide")
    .max(2000, "Le message est trop long"),
});

export type EnvoyerDemandeInput = z.infer<typeof envoyerDemandeSchema>;
export type EnvoyerMessageInput = z.infer<typeof envoyerMessageSchema>;
