# Coéquipiers (amis & messages) — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envoyer/accepter/refuser des demandes d'ami entre joueurs, et échanger des messages avec ses amis — pour construire des liens et pouvoir inviter un ami à rejoindre un match qui manque de joueurs.

**Architecture:** Deux nouveaux modèles indépendants des sous-projets Joueurs/Matchs en cours : `Amitie` (demande d'ami, directionnelle, avec statut) et `Message` (simple, entre deux utilisateurs — pas de modèle `Conversation` séparé : une conversation est dérivée en mémoire à partir des messages entre deux utilisateurs, ce qui suffit à cette échelle). L'envoi d'un message exige une amitié acceptée, vérifié à l'écriture.

**Ce plan est autonome** — il ne touche aucun fichier des sous-projets Joueurs ou Matchs en cours de construction en parallèle. Les deux points d'intégration UI prévus par la demande d'origine — un bouton « Ajouter en ami » sur la fiche d'un joueur (`/joueurs/[id]`), et un bouton « Inviter un ami » sur la fiche d'un match (`/matchs/[id]`) — **ne sont pas dans ce plan** : ces pages n'existent pas encore sur la branche à partir de laquelle ce plan démarre. Ce sont de petits ajouts faits séparément, une fois les trois branches fusionnées.

## Global Constraints

- Copie en français.
- Mobile-first.
- Toutes les routes exigent une session (`getServerSession`, 401 sinon).
- Envoyer un message à quelqu'un qui n'est pas un ami confirmé est refusé — vérifié côté serveur, jamais seulement côté client.
- `npm test`, `npm run lint`, `npm run build` verts après chaque tâche.
- Commit après chaque tâche.

---

### Task 1: Modèle de données & requêtes Amitié

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_amis_messages/migration.sql` (généré par Prisma)
- Modify: `tests/setup/testDb.ts`
- Create: `src/lib/amis/queries.ts`
- Test: `tests/lib/amis/queries.test.ts`

**Interfaces:**
- Produces: `statutRelation`, `envoyerDemande`, `accepterDemande`, `refuserDemande`, `findAmis`, `findDemandesRecues`, `sontAmis` (`@/lib/amis/queries`) — `sontAmis` est consommé par Task 2 (messages).

- [ ] **Step 1: Ajouter les modèles à `prisma/schema.prisma`**

À la fin du fichier :

```prisma
enum StatutAmitie {
  en_attente
  acceptee
  refusee
}

model Amitie {
  id             String       @id @default(cuid())
  demandeurId    String
  demandeur      User         @relation("AmitieDemandeur", fields: [demandeurId], references: [id], onDelete: Cascade)
  destinataireId String
  destinataire   User         @relation("AmitieDestinataire", fields: [destinataireId], references: [id], onDelete: Cascade)

  statut StatutAmitie @default(en_attente)

  createdAt   DateTime  @default(now())
  respondedAt DateTime?

  @@unique([demandeurId, destinataireId])
  @@index([destinataireId, statut])
}

model Message {
  id             String   @id @default(cuid())
  expediteurId   String
  expediteur     User     @relation("MessageExpediteur", fields: [expediteurId], references: [id], onDelete: Cascade)
  destinataireId String
  destinataire   User     @relation("MessageDestinataire", fields: [destinataireId], references: [id], onDelete: Cascade)

  contenu String

  createdAt DateTime  @default(now())
  luAt      DateTime?

  @@index([expediteurId, destinataireId])
  @@index([destinataireId, expediteurId])
}
```

Ajouter au modèle `User` (après `reservations Reservation[]`) :
```prisma
  demandesEnvoyees    Amitie[]  @relation("AmitieDemandeur")
  demandesRecues      Amitie[]  @relation("AmitieDestinataire")
  messagesEnvoyes     Message[] @relation("MessageExpediteur")
  messagesRecus       Message[] @relation("MessageDestinataire")
```

- [ ] **Step 2: Générer et appliquer la migration**

Run: `npx prisma migrate dev --name add_amis_messages`
Expected: succès, aucune extension manuelle nécessaire.

Run: `npm run db:migrate:test`
Expected: succès.

- [ ] **Step 3: Mettre à jour `resetDb()` dans `tests/setup/testDb.ts`**

`Message` et `Amitie` référencent `User` — leur suppression doit précéder celle de `user.deleteMany()`. Ajouter en tout début de fonction :

```ts
  await prisma.message.deleteMany();
  await prisma.amitie.deleteMany();
```

- [ ] **Step 4: Créer `src/lib/amis/queries.ts`**

```ts
import { prisma } from "@/lib/prisma";

export type StatutRelation = "aucune" | "demande_envoyee" | "demande_recue" | "amis";

export async function statutRelation(userIdA: string, userIdB: string): Promise<StatutRelation> {
  if (userIdA === userIdB) return "aucune";

  const amitie = await prisma.amitie.findFirst({
    where: {
      OR: [
        { demandeurId: userIdA, destinataireId: userIdB },
        { demandeurId: userIdB, destinataireId: userIdA },
      ],
    },
  });

  if (!amitie) return "aucune";
  if (amitie.statut === "refusee") return "aucune"; // une demande refusée peut être retentée
  if (amitie.statut === "acceptee") return "amis";
  return amitie.demandeurId === userIdA ? "demande_envoyee" : "demande_recue";
}

export type EnvoyerDemandeResultat =
  | { ok: true; id: string }
  | { ok: false; raison: "deja_amis" | "demande_existante" | "soi_meme" };

export async function envoyerDemande(
  demandeurId: string,
  destinataireId: string
): Promise<EnvoyerDemandeResultat> {
  if (demandeurId === destinataireId) return { ok: false, raison: "soi_meme" };

  const existante = await prisma.amitie.findFirst({
    where: {
      OR: [
        { demandeurId, destinataireId },
        { demandeurId: destinataireId, destinataireId: demandeurId },
      ],
      statut: { in: ["en_attente", "acceptee"] },
    },
  });
  if (existante) {
    return {
      ok: false,
      raison: existante.statut === "acceptee" ? "deja_amis" : "demande_existante",
    };
  }

  const amitie = await prisma.amitie.create({ data: { demandeurId, destinataireId } });
  return { ok: true, id: amitie.id };
}

export type RepondreResultat = { ok: true } | { ok: false; raison: "introuvable" };

export async function accepterDemande(id: string, userId: string): Promise<RepondreResultat> {
  const { count } = await prisma.amitie.updateMany({
    where: { id, destinataireId: userId, statut: "en_attente" },
    data: { statut: "acceptee", respondedAt: new Date() },
  });
  return count > 0 ? { ok: true } : { ok: false, raison: "introuvable" };
}

export async function refuserDemande(id: string, userId: string): Promise<RepondreResultat> {
  const { count } = await prisma.amitie.updateMany({
    where: { id, destinataireId: userId, statut: "en_attente" },
    data: { statut: "refusee", respondedAt: new Date() },
  });
  return count > 0 ? { ok: true } : { ok: false, raison: "introuvable" };
}

export type AmiResume = { id: string; prenom: string; ville: string; photoUrl: string | null };

export async function findAmis(userId: string): Promise<AmiResume[]> {
  const amities = await prisma.amitie.findMany({
    where: {
      statut: "acceptee",
      OR: [{ demandeurId: userId }, { destinataireId: userId }],
    },
    include: {
      demandeur: { select: { id: true, profile: { select: { prenom: true, ville: true, photoUrl: true } } } },
      destinataire: { select: { id: true, profile: { select: { prenom: true, ville: true, photoUrl: true } } } },
    },
  });

  return amities.map((a) => {
    const autre = a.demandeurId === userId ? a.destinataire : a.demandeur;
    return {
      id: autre.id,
      prenom: autre.profile?.prenom ?? "Joueur",
      ville: autre.profile?.ville ?? "",
      photoUrl: autre.profile?.photoUrl ?? null,
    };
  });
}

export type DemandeRecue = { id: string; demandeurId: string; prenom: string };

export async function findDemandesRecues(userId: string): Promise<DemandeRecue[]> {
  const demandes = await prisma.amitie.findMany({
    where: { destinataireId: userId, statut: "en_attente" },
    include: { demandeur: { select: { profile: { select: { prenom: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return demandes.map((d) => ({
    id: d.id,
    demandeurId: d.demandeurId,
    prenom: d.demandeur.profile?.prenom ?? "Joueur",
  }));
}

export async function sontAmis(userIdA: string, userIdB: string): Promise<boolean> {
  return (await statutRelation(userIdA, userIdB)) === "amis";
}
```

- [ ] **Step 5: Créer `tests/lib/amis/queries.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import {
  statutRelation,
  envoyerDemande,
  accepterDemande,
  refuserDemande,
  findAmis,
  findDemandesRecues,
  sontAmis,
} from "@/lib/amis/queries";

async function creerUtilisateur(email: string, prenom = "Joueur") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom, ville: "Tunis" } },
    },
  });
}

describe("amis/queries", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("starts with no relation between two users", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    expect(await statutRelation(a.id, b.id)).toBe("aucune");
  });

  it("sends a friend request and reflects it from both sides", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");

    const resultat = await envoyerDemande(a.id, b.id);
    expect(resultat.ok).toBe(true);

    expect(await statutRelation(a.id, b.id)).toBe("demande_envoyee");
    expect(await statutRelation(b.id, a.id)).toBe("demande_recue");
  });

  it("rejects sending a request to oneself", async () => {
    const a = await creerUtilisateur("a@example.com");
    const resultat = await envoyerDemande(a.id, a.id);
    expect(resultat).toEqual({ ok: false, raison: "soi_meme" });
  });

  it("rejects a duplicate pending request", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    await envoyerDemande(a.id, b.id);

    const resultat = await envoyerDemande(a.id, b.id);
    expect(resultat).toEqual({ ok: false, raison: "demande_existante" });
  });

  it("rejects a request when already friends", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const { id } = await envoyerDemande(a.id, b.id) as { id: string };
    await accepterDemande(id, b.id);

    const resultat = await envoyerDemande(b.id, a.id);
    expect(resultat).toEqual({ ok: false, raison: "deja_amis" });
  });

  it("accepts a request and makes both users friends", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const { id } = await envoyerDemande(a.id, b.id) as { id: string };

    const resultat = await accepterDemande(id, b.id);
    expect(resultat).toEqual({ ok: true });
    expect(await sontAmis(a.id, b.id)).toBe(true);

    const amisDeA = await findAmis(a.id);
    expect(amisDeA.map((x) => x.id)).toEqual([b.id]);
  });

  it("refuses to let someone else accept a request not addressed to them", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const c = await creerUtilisateur("c@example.com");
    const { id } = await envoyerDemande(a.id, b.id) as { id: string };

    const resultat = await accepterDemande(id, c.id);
    expect(resultat).toEqual({ ok: false, raison: "introuvable" });
    expect(await sontAmis(a.id, b.id)).toBe(false);
  });

  it("declining a request allows a new request to be sent later", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const { id } = await envoyerDemande(a.id, b.id) as { id: string };
    await refuserDemande(id, b.id);

    expect(await statutRelation(a.id, b.id)).toBe("aucune");
    const resultat = await envoyerDemande(a.id, b.id);
    expect(resultat.ok).toBe(true);
  });

  it("lists pending received requests", async () => {
    const a = await creerUtilisateur("a@example.com", "Amine");
    const b = await creerUtilisateur("b@example.com");
    await envoyerDemande(a.id, b.id);

    const demandes = await findDemandesRecues(b.id);
    expect(demandes).toHaveLength(1);
    expect(demandes[0].prenom).toBe("Amine");
  });
});
```

- [ ] **Step 6: Lancer les tests, lint et build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations tests/setup/testDb.ts src/lib/amis/queries.ts tests/lib/amis/queries.test.ts
git commit -m "feat(amis): add Amitie model and friend-request query layer"
```

---

### Task 2: Requêtes Messages

**Files:**
- Create: `src/lib/messages/queries.ts`
- Test: `tests/lib/messages/queries.test.ts`

**Interfaces:**
- Consumes (Task 1): `sontAmis` from `@/lib/amis/queries`.
- Produces: `envoyerMessage`, `findConversation`, `findConversations` — consommés par Task 3.

- [ ] **Step 1: Créer `src/lib/messages/queries.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { sontAmis } from "@/lib/amis/queries";

export type MessageResume = {
  id: string;
  expediteurId: string;
  contenu: string;
  createdAt: Date;
};

export type ConversationResume = {
  autreUserId: string;
  autrePrenom: string;
  dernierMessage: string;
  dernierMessageAt: Date;
};

export type EnvoyerMessageResultat =
  | { ok: true; id: string }
  | { ok: false; raison: "pas_amis" };

/**
 * L'amitié est vérifiée à l'écriture, pas seulement à l'affichage du bouton
 * côté client — un utilisateur ne peut pas contourner l'exigence en
 * appelant directement l'API.
 */
export async function envoyerMessage(
  expediteurId: string,
  destinataireId: string,
  contenu: string
): Promise<EnvoyerMessageResultat> {
  if (!(await sontAmis(expediteurId, destinataireId))) {
    return { ok: false, raison: "pas_amis" };
  }
  const message = await prisma.message.create({
    data: { expediteurId, destinataireId, contenu },
  });
  return { ok: true, id: message.id };
}

export async function findConversation(
  userIdA: string,
  userIdB: string
): Promise<MessageResume[]> {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { expediteurId: userIdA, destinataireId: userIdB },
        { expediteurId: userIdB, destinataireId: userIdA },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return messages.map((m) => ({
    id: m.id,
    expediteurId: m.expediteurId,
    contenu: m.contenu,
    createdAt: m.createdAt,
  }));
}

/**
 * Une conversation par interlocuteur distinct, réduite en mémoire à partir
 * des messages — pas de modèle Conversation séparé, ça suffit à cette
 * échelle (voir le plan). Les messages sont déjà triés du plus récent au
 * plus ancien, donc la première occurrence de chaque interlocuteur est
 * son dernier message.
 */
export async function findConversations(userId: string): Promise<ConversationResume[]> {
  const messages = await prisma.message.findMany({
    where: { OR: [{ expediteurId: userId }, { destinataireId: userId }] },
    orderBy: { createdAt: "desc" },
    include: {
      expediteur: { select: { profile: { select: { prenom: true } } } },
      destinataire: { select: { profile: { select: { prenom: true } } } },
    },
  });

  const parAutreUtilisateur = new Map<string, ConversationResume>();
  for (const m of messages) {
    const autreEstExpediteur = m.expediteurId !== userId;
    const autreUserId = autreEstExpediteur ? m.expediteurId : m.destinataireId;
    if (parAutreUtilisateur.has(autreUserId)) continue;
    const autrePrenom =
      (autreEstExpediteur ? m.expediteur.profile?.prenom : m.destinataire.profile?.prenom) ??
      "Joueur";
    parAutreUtilisateur.set(autreUserId, {
      autreUserId,
      autrePrenom,
      dernierMessage: m.contenu,
      dernierMessageAt: m.createdAt,
    });
  }
  return Array.from(parAutreUtilisateur.values());
}
```

- [ ] **Step 2: Créer `tests/lib/messages/queries.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../../setup/testDb";
import { hashPassword } from "@/lib/password";
import { envoyerDemande, accepterDemande } from "@/lib/amis/queries";
import { envoyerMessage, findConversation, findConversations } from "@/lib/messages/queries";

async function creerUtilisateur(email: string, prenom = "Joueur") {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom, ville: "Tunis" } },
    },
  });
}

async function creerAmis(prenomA: string, prenomB: string) {
  const a = await creerUtilisateur(`${prenomA.toLowerCase()}@example.com`, prenomA);
  const b = await creerUtilisateur(`${prenomB.toLowerCase()}@example.com`, prenomB);
  const { id } = (await envoyerDemande(a.id, b.id)) as { id: string };
  await accepterDemande(id, b.id);
  return { a, b };
}

describe("messages/queries", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("refuses to send a message between non-friends", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");

    const resultat = await envoyerMessage(a.id, b.id, "Salut !");
    expect(resultat).toEqual({ ok: false, raison: "pas_amis" });
  });

  it("sends a message between friends and it appears in the conversation", async () => {
    const { a, b } = await creerAmis("Amine", "Bilel");

    const resultat = await envoyerMessage(a.id, b.id, "On joue quand ?");
    expect(resultat.ok).toBe(true);

    const conversation = await findConversation(a.id, b.id);
    expect(conversation).toHaveLength(1);
    expect(conversation[0].contenu).toBe("On joue quand ?");
    expect(conversation[0].expediteurId).toBe(a.id);
  });

  it("returns messages from both directions in chronological order", async () => {
    const { a, b } = await creerAmis("Amine", "Bilel");
    await envoyerMessage(a.id, b.id, "Premier");
    await envoyerMessage(b.id, a.id, "Deuxième");

    const conversation = await findConversation(a.id, b.id);
    expect(conversation.map((m) => m.contenu)).toEqual(["Premier", "Deuxième"]);
  });

  it("lists conversations with the last message per contact", async () => {
    const { a, b } = await creerAmis("Amine", "Bilel");
    await envoyerMessage(a.id, b.id, "Ancien message");
    await envoyerMessage(b.id, a.id, "Message récent");

    const conversations = await findConversations(a.id);
    expect(conversations).toHaveLength(1);
    expect(conversations[0].autreUserId).toBe(b.id);
    expect(conversations[0].dernierMessage).toBe("Message récent");
  });
});
```

- [ ] **Step 3: Lancer les tests, lint et build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert.

- [ ] **Step 4: Commit**

```bash
git add src/lib/messages/queries.ts tests/lib/messages/queries.test.ts
git commit -m "feat(messages): add friend-gated conversation query layer"
```

---

### Task 3: Validation & API Amis/Messages

**Files:**
- Create: `src/lib/validation/amis.ts`
- Test: `tests/lib/validation/amis.test.ts`
- Create: `src/app/api/amis/route.ts` (POST — envoyer une demande)
- Create: `src/app/api/amis/[id]/accepter/route.ts`
- Create: `src/app/api/amis/[id]/refuser/route.ts`
- Create: `src/app/api/messages/[userId]/route.ts` (GET — historique, POST — envoyer)
- Test: `tests/api/amis.test.ts`
- Test: `tests/api/messages.test.ts`

**Interfaces:**
- Consumes (Task 1): `envoyerDemande`, `accepterDemande`, `refuserDemande`.
- Consumes (Task 2): `envoyerMessage`, `findConversation`.
- Produces: `POST /api/amis` (201/400/401/409), `POST /api/amis/[id]/accepter` (200/401/404), `POST /api/amis/[id]/refuser` (200/401/404), `GET /api/messages/[userId]` (200/401), `POST /api/messages/[userId]` (201/400/401/403) — consommés par Task 4.

- [ ] **Step 1: Créer `src/lib/validation/amis.ts`**

```ts
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
```

- [ ] **Step 2: Créer `tests/lib/validation/amis.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { envoyerDemandeSchema, envoyerMessageSchema } from "@/lib/validation/amis";

describe("envoyerDemandeSchema", () => {
  it("accepts a valid payload", () => {
    expect(envoyerDemandeSchema.safeParse({ destinataireId: "u1" }).success).toBe(true);
  });

  it("rejects a missing destinataireId", () => {
    expect(envoyerDemandeSchema.safeParse({}).success).toBe(false);
  });
});

describe("envoyerMessageSchema", () => {
  it("accepts a valid message", () => {
    expect(envoyerMessageSchema.safeParse({ contenu: "Salut !" }).success).toBe(true);
  });

  it("rejects an empty message", () => {
    expect(envoyerMessageSchema.safeParse({ contenu: "   " }).success).toBe(false);
  });

  it("rejects a message longer than 2000 characters", () => {
    expect(envoyerMessageSchema.safeParse({ contenu: "a".repeat(2001) }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Créer `src/app/api/amis/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { envoyerDemandeSchema } from "@/lib/validation/amis";
import { envoyerDemande } from "@/lib/amis/queries";
import { parseJsonBody } from "@/lib/api/parseJsonBody";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = envoyerDemandeSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await envoyerDemande(session.user.id, parsed.data.destinataireId);
  if (!resultat.ok) {
    const messages: Record<typeof resultat.raison, string> = {
      soi_meme: "Vous ne pouvez pas vous ajouter vous-même.",
      deja_amis: "Vous êtes déjà amis.",
      demande_existante: "Une demande est déjà en attente.",
    };
    return NextResponse.json({ error: messages[resultat.raison] }, { status: 409 });
  }

  return NextResponse.json({ id: resultat.id }, { status: 201 });
}
```

- [ ] **Step 4: Créer `src/app/api/amis/[id]/accepter/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { accepterDemande } from "@/lib/amis/queries";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await context.params;

  const resultat = await accepterDemande(id, session.user.id);
  if (!resultat.ok) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  return NextResponse.json({ message: "Demande acceptée." });
}
```

- [ ] **Step 5: Créer `src/app/api/amis/[id]/refuser/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { refuserDemande } from "@/lib/amis/queries";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { id } = await context.params;

  const resultat = await refuserDemande(id, session.user.id);
  if (!resultat.ok) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  return NextResponse.json({ message: "Demande refusée." });
}
```

- [ ] **Step 6: Créer `src/app/api/messages/[userId]/route.ts`**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { envoyerMessageSchema } from "@/lib/validation/amis";
import { envoyerMessage, findConversation } from "@/lib/messages/queries";
import { parseJsonBody } from "@/lib/api/parseJsonBody";

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { userId } = await context.params;

  const messages = await findConversation(session.user.id, userId);
  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const { userId } = await context.params;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = envoyerMessageSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const resultat = await envoyerMessage(session.user.id, userId, parsed.data.contenu);
  if (!resultat.ok) {
    return NextResponse.json(
      { error: "Vous ne pouvez envoyer un message qu'à un ami." },
      { status: 403 }
    );
  }

  return NextResponse.json({ id: resultat.id }, { status: 201 });
}
```

- [ ] **Step 7: Créer `tests/api/amis.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { POST as envoyer } from "@/app/api/amis/route";
import { POST as accepter } from "@/app/api/amis/[id]/accepter/route";
import { POST as refuser } from "@/app/api/amis/[id]/refuser/route";

async function creerUtilisateur(email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

function creerRequest(body: unknown) {
  return new Request("http://localhost/api/amis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/amis", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await envoyer(creerRequest({ destinataireId: "u1" }));
    expect(response.status).toBe(401);
  });

  it("creates a friend request", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);

    const response = await envoyer(creerRequest({ destinataireId: b.id }));
    expect(response.status).toBe(201);
  });

  it("returns 409 for a duplicate request", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);
    await envoyer(creerRequest({ destinataireId: b.id }));

    const response = await envoyer(creerRequest({ destinataireId: b.id }));
    expect(response.status).toBe(409);
  });
});

describe("accepter/refuser a friend request", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("accepts a request addressed to the current user", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);
    const createResponse = await envoyer(creerRequest({ destinataireId: b.id }));
    const { id } = await createResponse.json();

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: b.id } } as never);
    const response = await accepter(
      new Request(`http://localhost/api/amis/${id}/accepter`, { method: "POST" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(200);
  });

  it("returns 404 when refusing someone else's request", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    const c = await creerUtilisateur("c@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);
    const createResponse = await envoyer(creerRequest({ destinataireId: b.id }));
    const { id } = await createResponse.json();

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: c.id } } as never);
    const response = await refuser(
      new Request(`http://localhost/api/amis/${id}/refuser`, { method: "POST" }),
      { params: Promise.resolve({ id }) }
    );
    expect(response.status).toBe(404);
  });
});
```

- [ ] **Step 8: Créer `tests/api/messages.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../setup/testDb";
import { hashPassword } from "@/lib/password";
import { envoyerDemande, accepterDemande } from "@/lib/amis/queries";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";
import { GET as lireConversation, POST as envoyer } from "@/app/api/messages/[userId]/route";

async function creerUtilisateur(email: string) {
  return prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword("motdepasse123"),
      profile: { create: { prenom: "Test", ville: "Tunis" } },
    },
  });
}

async function creerAmis() {
  const a = await creerUtilisateur("a@example.com");
  const b = await creerUtilisateur("b@example.com");
  const { id } = (await envoyerDemande(a.id, b.id)) as { id: string };
  await accepterDemande(id, b.id);
  return { a, b };
}

function creerMessageRequest(body: unknown) {
  return new Request("http://localhost/api/messages/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/messages/[userId]", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(getServerSession).mockReset();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await lireConversation(
      new Request("http://localhost/api/messages/x"),
      { params: Promise.resolve({ userId: "x" }) }
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 when sending to a non-friend", async () => {
    const a = await creerUtilisateur("a@example.com");
    const b = await creerUtilisateur("b@example.com");
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);

    const response = await envoyer(creerMessageRequest({ contenu: "Salut" }), {
      params: Promise.resolve({ userId: b.id }),
    });
    expect(response.status).toBe(403);
  });

  it("sends a message between friends and it appears in the GET history", async () => {
    const { a, b } = await creerAmis();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);

    const postResponse = await envoyer(creerMessageRequest({ contenu: "On joue quand ?" }), {
      params: Promise.resolve({ userId: b.id }),
    });
    expect(postResponse.status).toBe(201);

    const getResponse = await lireConversation(new Request("http://localhost/api/messages/x"), {
      params: Promise.resolve({ userId: b.id }),
    });
    const body = await getResponse.json();
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].contenu).toBe("On joue quand ?");
  });

  it("returns 400 for an empty message", async () => {
    const { a, b } = await creerAmis();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: a.id } } as never);

    const response = await envoyer(creerMessageRequest({ contenu: "  " }), {
      params: Promise.resolve({ userId: b.id }),
    });
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 9: Lancer la suite complète, lint et build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert.

- [ ] **Step 10: Commit**

```bash
git add src/lib/validation/amis.ts tests/lib/validation/amis.test.ts src/app/api/amis src/app/api/messages tests/api/amis.test.ts tests/api/messages.test.ts
git commit -m "feat(amis): add friend-request and messaging API"
```

---

### Task 4: Pages Amis & Messages

**Files:**
- Create: `src/components/amis/DemandeCard.tsx`
- Create: `src/components/amis/AmiCard.tsx`
- Create: `src/components/messages/ConversationThread.tsx`
- Modify: `src/app/joueurs/[id]/page.tsx` — **si ce fichier n'existe pas encore** (vérifier avec `ls src/app/joueurs/[id]/page.tsx`), **ignorer cette partie du Step 5 et le signaler dans le rapport** plutôt que de créer une page qui appartient au sous-projet Joueurs.
- Create: `src/app/amis/page.tsx`
- Create: `src/app/amis/[id]/page.tsx`
- Modify: `src/middleware.ts`
- Test: `tests/components/DemandeCard.test.tsx`
- Test: `tests/components/AmiCard.test.tsx`

**Interfaces:**
- Consumes (Task 1/2): `findAmis`, `findDemandesRecues`, `findConversation`, `findConversations`.
- Consumes (Task 3): les 5 routes API.

- [ ] **Step 1: Créer `src/components/amis/DemandeCard.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DemandeCard({ id, prenom }: { id: string; prenom: string }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState<"accepter" | "refuser" | null>(null);

  async function repondre(action: "accepter" | "refuser") {
    setEnvoi(action);
    try {
      await fetch(`/api/amis/${id}/${action}`, { method: "POST" });
      router.refresh();
    } finally {
      setEnvoi(null);
    }
  }

  return (
    <li className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <span className="text-sm font-medium text-anthracite">{prenom}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => repondre("accepter")}
          disabled={envoi !== null}
          className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {envoi === "accepter" ? "..." : "Accepter"}
        </button>
        <button
          type="button"
          onClick={() => repondre("refuser")}
          disabled={envoi !== null}
          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-anthracite disabled:opacity-50"
        >
          {envoi === "refuser" ? "..." : "Refuser"}
        </button>
      </div>
    </li>
  );
}
```

- [ ] **Step 2: Test — créer `tests/components/DemandeCard.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DemandeCard } from "@/components/amis/DemandeCard";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("DemandeCard", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it("shows the requester's name", () => {
    render(<DemandeCard id="d1" prenom="Amine" />);
    expect(screen.getByText("Amine")).toBeInTheDocument();
  });

  it("accepts the request and refreshes", async () => {
    render(<DemandeCard id="d1" prenom="Amine" />);
    fireEvent.click(screen.getByRole("button", { name: "Accepter" }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith("/api/amis/d1/accepter", { method: "POST" });
  });

  it("declines the request and refreshes", async () => {
    render(<DemandeCard id="d1" prenom="Amine" />);
    fireEvent.click(screen.getByRole("button", { name: "Refuser" }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith("/api/amis/d1/refuser", { method: "POST" });
  });
});
```

- [ ] **Step 3: Créer `src/components/amis/AmiCard.tsx`**

```tsx
import Link from "next/link";

export function AmiCard({ ami }: { ami: { id: string; prenom: string; ville: string } }) {
  return (
    <Link
      href={`/amis/${ami.id}`}
      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-primary hover:shadow-md"
    >
      <div>
        <p className="text-sm font-medium text-anthracite">{ami.prenom}</p>
        <p className="text-xs text-gray-600">{ami.ville}</p>
      </div>
      <span className="text-xs text-primary">Discuter →</span>
    </Link>
  );
}
```

- [ ] **Step 4: Test — créer `tests/components/AmiCard.test.tsx`**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AmiCard } from "@/components/amis/AmiCard";

describe("AmiCard", () => {
  it("shows the friend's name and links to the conversation", () => {
    render(<AmiCard ami={{ id: "u1", prenom: "Amine", ville: "Tunis" }} />);
    expect(screen.getByText("Amine")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/amis/u1");
  });
});
```

- [ ] **Step 5: Créer `src/components/messages/ConversationThread.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Message = { id: string; expediteurId: string; contenu: string; createdAt: string };

export function ConversationThread({
  autreUserId,
  moiId,
  messages,
}: {
  autreUserId: string;
  moiId: string;
  messages: Message[];
}) {
  const router = useRouter();
  const [contenu, setContenu] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!contenu.trim()) return;
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch(`/api/messages/${autreUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu }),
      });
      if (!response.ok) {
        setErreur("Impossible d'envoyer ce message.");
        return;
      }
      setContenu("");
      router.refresh();
    } catch {
      setErreur("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
              m.expediteurId === moiId
                ? "self-end bg-primary text-white"
                : "self-start bg-gray-100 text-anthracite"
            }`}
          >
            {m.contenu}
          </li>
        ))}
      </ul>

      {erreur && (
        <p role="alert" className="text-sm text-red-600">
          {erreur}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={envoi || !contenu.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Créer `src/app/amis/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findAmis, findDemandesRecues } from "@/lib/amis/queries";
import { AmiCard } from "@/components/amis/AmiCard";
import { DemandeCard } from "@/components/amis/DemandeCard";

export default async function AmisPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  const [amis, demandes] = await Promise.all([
    findAmis(session.user.id),
    findDemandesRecues(session.user.id),
  ]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-6">
      <h1 className="text-xl font-semibold text-anthracite">Amis</h1>

      {demandes.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold text-anthracite">Demandes reçues</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {demandes.map((d) => (
              <DemandeCard key={d.id} id={d.id} prenom={d.prenom} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4">
        <h2 className="text-sm font-semibold text-anthracite">Mes amis</h2>
        {amis.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">
            Vous n&apos;avez pas encore d&apos;amis. Trouvez des coéquipiers sur la page Joueurs.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {amis.map((ami) => (
              <li key={ami.id}>
                <AmiCard ami={ami} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 7: Créer `src/app/amis/[id]/page.tsx`**

```tsx
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sontAmis } from "@/lib/amis/queries";
import { findConversation } from "@/lib/messages/queries";
import { prisma } from "@/lib/prisma";
import { ConversationThread } from "@/components/messages/ConversationThread";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/connexion");
  }

  const { id } = await params;

  if (!(await sontAmis(session.user.id, id))) {
    notFound();
  }

  const autre = await prisma.user.findUnique({
    where: { id },
    select: { profile: { select: { prenom: true } } },
  });
  if (!autre) notFound();

  const messages = await findConversation(session.user.id, id);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-6">
      <Link href="/amis" className="text-sm text-primary hover:underline">
        ← Retour aux amis
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-anthracite">
        {autre.profile?.prenom ?? "Conversation"}
      </h1>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <ConversationThread
          autreUserId={id}
          moiId={session.user.id}
          messages={messages.map((m) => ({
            id: m.id,
            expediteurId: m.expediteurId,
            contenu: m.contenu,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Modifier `src/middleware.ts`**

Ajouter `/amis/:path*` au tableau `matcher`. **Attention :** d'autres sous-projets modifient aussi ce fichier en parallèle (Joueurs, Matchs) — lire le fichier avant d'éditer et fusionner votre entrée dans le tableau existant plutôt que d'écraser les autres.

- [ ] **Step 9: Lancer les tests, lint et build**

Run: `npm test && npm run lint && npm run build`
Expected: tout vert.

- [ ] **Step 10: Vérification manuelle**

Run: `npm run dev -- -p 3100` (tuer le serveur après vérification)

Avec deux comptes de test : envoyer une demande via `POST /api/amis` (pas encore de bouton dans l'UI existante — utiliser `curl` ou la console réseau du navigateur), l'accepter depuis `/amis`, envoyer un message depuis `/amis/[id]`.

- [ ] **Step 11: Commit**

```bash
git add src/components/amis src/components/messages src/app/amis src/middleware.ts tests/components/DemandeCard.test.tsx tests/components/AmiCard.test.tsx
git commit -m "feat(amis): add friends list, requests, and conversation pages"
```

## Self-Review Notes (controller-facing)

- **Spec coverage :** demandes d'ami (Task 1+3+4), messagerie limitée aux amis (Task 2+3+4), page de gestion (Task 4). **Non couvert par ce plan, volontairement** : le bouton « Ajouter en ami » sur `/joueurs/[id]` et le bouton « Inviter un ami » sur `/matchs/[id]` — ces pages n'existent pas encore sur la branche de départ ; ce sont de petits ajouts à faire une fois les trois sous-projets fusionnés.
- **Aucun placeholder.**
- **Cohérence de types :** `AmiResume`, `DemandeRecue`, `MessageResume`, `ConversationResume` définis une fois (Task 1/2), réutilisés à l'identique.
- **Sécurité :** l'amitié est vérifiée côté serveur à l'envoi d'un message (Task 2), pas seulement par l'absence de bouton côté client — un appel direct à l'API par un non-ami est refusé (403).
