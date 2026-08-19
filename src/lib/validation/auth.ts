import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email("Adresse e-mail invalide");

export const signupSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  prenom: z.string().min(1, "Le prénom est requis"),
  ville: z.string().min(1, "La ville est requise"),
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
