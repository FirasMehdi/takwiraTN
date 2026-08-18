import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { GET, PUT } from "@/app/api/profil/route";

function makePutRequest(body: unknown) {
  return new Request("http://localhost/api/profil", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/profil", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the profile for an authenticated user", async () => {
    const user = await prisma.user.create({
      data: {
        email: "profil@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "Amine", ville: "Sousse" } },
      },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await GET();
    const body = await response.json();
    expect(body.prenom).toBe("Amine");
  });

  it("updates the profile with valid data", async () => {
    const user = await prisma.user.create({
      data: {
        email: "profil2@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "Amine", ville: "Sousse" } },
      },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await PUT(
      makePutRequest({ prenom: "Amine K.", ville: "Sousse", niveau: "avance" })
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.prenom).toBe("Amine K.");
    expect(body.niveau).toBe("avance");
  });

  it("rejects an invalid payload with 400", async () => {
    const user = await prisma.user.create({
      data: {
        email: "profil3@example.com",
        passwordHash: await hashPassword("motdepasse123"),
        profile: { create: { prenom: "Amine", ville: "Sousse" } },
      },
    });
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: user.id } } as never);

    const response = await PUT(makePutRequest({ prenom: "", ville: "Sousse" }));
    expect(response.status).toBe(400);
  });
});
