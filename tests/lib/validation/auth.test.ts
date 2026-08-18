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
});
