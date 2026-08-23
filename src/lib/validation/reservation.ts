import { z } from "zod";
import { dateSchema, heureSchema } from "@/lib/validation/terrain";

export const reservationSchema = z.object({
  date: dateSchema,
  heureDebut: heureSchema,
});

export type ReservationInput = z.infer<typeof reservationSchema>;
