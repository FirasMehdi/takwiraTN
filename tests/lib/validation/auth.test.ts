import { describe, it, expect } from "vitest";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

describe("signupSchema", () => {
  it("accepts a valid payload", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = signupSchema.safeParse({
      email: "pas-un-email",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "1234567",
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an e-mail longer than 254 characters", () => {
    const local = "a".repeat(255 - "@example.com".length);
    const result = signupSchema.safeParse({
      email: `${local}@example.com`,
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an e-mail exactly 254 characters long", () => {
    const local = "a".repeat(254 - "@example.com".length);
    const result = signupSchema.safeParse({
      email: `${local}@example.com`,
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password longer than 72 characters", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "a".repeat(73),
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a password exactly 72 characters long", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "a".repeat(72),
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a prenom longer than 80 characters", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "a".repeat(81),
      ville: "Tunis",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a prenom exactly 80 characters long", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "a".repeat(80),
      ville: "Tunis",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a ville longer than 80 characters", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "a".repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a ville exactly 80 characters long", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "a".repeat(80),
    });
    expect(result.success).toBe(true);
  });

  it("defaults estProprietaire to false when omitted", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estProprietaire).toBe(false);
    }
  });

  it("accepts estProprietaire set to true", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
      estProprietaire: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estProprietaire).toBe(true);
    }
  });

  it("rejects a non-boolean estProprietaire", () => {
    const result = signupSchema.safeParse({
      email: "a@example.com",
      password: "motdepasse123",
      prenom: "Sami",
      ville: "Tunis",
      estProprietaire: "yes",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts email + password", () => {
    const result = loginSchema.safeParse({
      email: "a@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@example.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires a token and a valid new password", () => {
    const result = resetPasswordSchema.safeParse({
      token: "abc123",
      password: "motdepasse123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing or empty token", () => {
    const result = resetPasswordSchema.safeParse({ token: "", password: "motdepasse123" });
    expect(result.success).toBe(false);
  });

  it("rejects a password longer than 72 characters", () => {
    const result = resetPasswordSchema.safeParse({ token: "abc123", password: "a".repeat(73) });
    expect(result.success).toBe(false);
  });

  it("accepts a password exactly 72 characters long", () => {
    const result = resetPasswordSchema.safeParse({ token: "abc123", password: "a".repeat(72) });
    expect(result.success).toBe(true);
  });
});
