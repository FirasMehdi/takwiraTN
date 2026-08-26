import { PrismaClient, type Prisma } from "@prisma/client";
import { fileURLToPath } from "node:url";

type Client = PrismaClient | Prisma.TransactionClient;

export type PromouvoirAdminResultat =
  | { ok: true; email: string }
  | { ok: false; raison: "introuvable" };

/**
 * Promeut un utilisateur existant au rôle administrateur. C'est la seule
 * voie de création d'un compte admin — il n'existe aucune inscription
 * libre-service pour ce rôle.
 */
export async function promouvoirAdmin(
  email: string,
  client: Client
): Promise<PromouvoirAdminResultat> {
  const utilisateur = await client.user.findUnique({ where: { email } });
  if (!utilisateur) return { ok: false, raison: "introuvable" };

  await client.user.update({ where: { email }, data: { role: "administrateur" } });
  return { ok: true, email };
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: tsx scripts/promouvoir-admin.ts <email>");
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const resultat = await promouvoirAdmin(email, prisma);
    if (!resultat.ok) {
      console.error(`Aucun utilisateur trouvé pour l'e-mail "${email}".`);
      process.exitCode = 1;
      return;
    }
    console.log(`Le compte "${resultat.email}" est désormais administrateur.`);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuté seulement en ligne de commande, jamais à l'import depuis les tests
// — même garde que prisma/seed.ts (voir ce fichier pour le raisonnement).
function estExecuteDirectement(): boolean {
  if (!process.argv[1]) return false;
  const cheminModule = fileURLToPath(import.meta.url).replace(/\\/g, "/").toLowerCase();
  const cheminScript = process.argv[1].replace(/\\/g, "/").toLowerCase();
  return cheminModule === cheminScript;
}

if (estExecuteDirectement()) {
  main();
}
