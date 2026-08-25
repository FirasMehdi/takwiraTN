import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  creerNotification,
  findNotifications,
  countNotificationsNonLues,
  marquerCommeLue,
  marquerToutesCommeLues,
} from "@/lib/notifications/queries";

async function creerUtilisateur(email: string, prenom = "Joueur") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom, ville: "Tunis" } },
    },
  });
}

describe("notifications/queries", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creerNotification then findNotifications returns it, newest first", async () => {
    const user = await creerUtilisateur("u1@test.com", "Amine");
    await creerNotification({ userId: user.id, type: "message", contenu: "Premier" });
    await creerNotification({ userId: user.id, type: "message", contenu: "Second" });

    const notifications = await findNotifications(user.id);
    expect(notifications).toHaveLength(2);
    expect(notifications[0].contenu).toBe("Second");
    expect(notifications[0].lu).toBe(false);
  });

  it("countNotificationsNonLues counts only unread notifications for that user", async () => {
    const user = await creerUtilisateur("u1@test.com", "Amine");
    const autre = await creerUtilisateur("u2@test.com", "Sami");
    await creerNotification({ userId: user.id, type: "message", contenu: "A" });
    await creerNotification({ userId: user.id, type: "message", contenu: "B" });
    await creerNotification({ userId: autre.id, type: "message", contenu: "C" });

    expect(await countNotificationsNonLues(user.id)).toBe(2);
    expect(await countNotificationsNonLues(autre.id)).toBe(1);
  });

  it("marquerCommeLue marks only the target notification and only for its owner", async () => {
    const user = await creerUtilisateur("u1@test.com", "Amine");
    const autre = await creerUtilisateur("u2@test.com", "Sami");
    await creerNotification({ userId: user.id, type: "message", contenu: "A" });
    const notifications = await findNotifications(user.id);
    const cible = notifications[0];

    const resultatAutre = await marquerCommeLue(cible.id, autre.id);
    expect(resultatAutre.ok).toBe(false);

    const resultat = await marquerCommeLue(cible.id, user.id);
    expect(resultat.ok).toBe(true);
    expect(await countNotificationsNonLues(user.id)).toBe(0);
  });

  it("marquerToutesCommeLues clears the unread count", async () => {
    const user = await creerUtilisateur("u1@test.com", "Amine");
    await creerNotification({ userId: user.id, type: "message", contenu: "A" });
    await creerNotification({ userId: user.id, type: "message", contenu: "B" });

    await marquerToutesCommeLues(user.id);
    expect(await countNotificationsNonLues(user.id)).toBe(0);
  });
});
