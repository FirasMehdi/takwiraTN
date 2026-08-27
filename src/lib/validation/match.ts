import { z } from "zod";
import { dateSchema, heureSchema, formatSchema } from "@/lib/validation/terrain";

export const matchListQuerySchema = z.object({
  date: dateSchema.optional(),
  ville: z.string().trim().min(1, "La ville ne peut pas être vide").max(80, "Le nom de la ville est trop long").optional(),
});

export const creerMatchSchema = z
  .object({
    terrainId: z.string().min(1, "Le terrain est requis"),
    date: dateSchema,
    heureDebut: heureSchema,
    heureFin: heureSchema,
    format: formatSchema,
    joueursMax: z.coerce
      .number()
      .int("Le nombre de joueurs doit être un entier")
      .min(2, "Il faut au moins 2 joueurs")
      .max(30, "Trop de joueurs pour un seul match"),
    // Volontairement un vrai booléen, pas un coerce : l'organisateur doit
    // trancher explicitement entre « je joue » et « j'organise seulement »,
    // et une valeur absente ne doit pas être silencieusement lue comme false.
    organisateurParticipe: z.boolean({
      required_error: "Précisez si vous jouez ce match",
      invalid_type_error: "Précisez si vous jouez ce match",
    }),
    description: z.string().trim().max(500, "La description est trop longue").optional(),
  })
  // Comparaison de chaînes "HH:MM" zéro-paddées sur 24h : suffisant, pas
  // besoin de repasser par des objets Date. Un créneau inversé ou nul (ex.
  // 20:00 → 08:00) rendrait le match "estTermine" dès sa création.
  .refine((valeur) => valeur.heureFin > valeur.heureDebut, {
    message: "L'heure de fin doit être après l'heure de début",
    path: ["heureFin"],
  });

export const raisonAnnulationSchema = z.enum(
  ["personnel", "pas_assez_joueurs", "conflit_horaire", "terrain_indisponible", "autre"],
  { errorMap: () => ({ message: "Motif d'annulation invalide" }) }
);

export const annulerMatchSchema = z
  .object({
    raison: raisonAnnulationSchema,
    raisonAutre: z.string().trim().max(200, "La précision est trop longue").optional(),
  })
  .refine((valeur) => valeur.raison !== "autre" || (valeur.raisonAutre?.length ?? 0) > 0, {
    message: "Précisez le motif de l'annulation",
    path: ["raisonAutre"],
  });

export const decisionReservationSchema = z.object({
  reserver: z.boolean({
    required_error: "Précisez votre décision",
    invalid_type_error: "Précisez votre décision",
  }),
});

export type CreerMatchInput = z.infer<typeof creerMatchSchema>;
export type MatchListQuery = z.infer<typeof matchListQuerySchema>;
export type AnnulerMatchBody = z.infer<typeof annulerMatchSchema>;
export type DecisionReservationBody = z.infer<typeof decisionReservationSchema>;
