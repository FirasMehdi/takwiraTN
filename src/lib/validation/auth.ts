import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Adresse e-mail invalide")
  .max(254, "L'adresse e-mail est trop longue");

export const signupSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    // bcrypt silently ignores any bytes past the 72nd, so an uncapped
    // password field would let two different long passwords that share the
    // same first 72 bytes hash identically. Rejecting past 72 up front is
    // more correct than accepting and silently truncating.
    .max(72, "Le mot de passe ne peut pas dépasser 72 caractères"),
  prenom: z.string().min(1, "Le prénom est requis").max(80, "Le prénom est trop long"),
  ville: z.string().min(1, "La ville est requise").max(80, "Le nom de la ville est trop long"),
});

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Le mot de passe est requis"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Le jeton est requis"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});
