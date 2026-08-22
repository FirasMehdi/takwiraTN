# Design — Sous-projet 2 : Terrains (Takwria TN)

Date : 2026-08-22
Statut : Approuvé pour planification

## Contexte

Le sous-projet 1 (*Fondations & Authentification*) est terminé et fusionné :
scaffold Next.js/TypeScript/Prisma/PostgreSQL/Tailwind, authentification
e-mail + mot de passe (NextAuth, sessions JWT), profils joueurs, middleware de
protection des routes, et coquille de navigation mobile avec pages stub pour
`/terrains`, `/matchs`, `/joueurs`.

Ce document couvre le **sous-projet 2 : Terrains** — la recherche, la
consultation et l'affichage des disponibilités des terrains.

Sous-projets suivants (hors périmètre) :
3. Réservations (booking, anti-double-réservation, tableau de bord)
4. Matchs (création, participation)
5. Coéquipiers & Notifications
6. Espace propriétaire & Administration

## Objectif

Permettre à un visiteur de trouver un terrain : rechercher par ville, date et
horaire, filtrer, consulter une fiche détaillée, et voir les créneaux
disponibles — **sans encore pouvoir réserver**.

## Frontière de périmètre

Ce sous-projet est **en lecture seule** sur les données terrain. Il n'écrit
rien : ni réservation, ni création de terrain.

- **Inclus** : modèle de données terrain, données de test (seed), recherche et
  filtres, fiche détaillée, génération et affichage des créneaux.
- **Exclu** : réserver un créneau (sous-projet 3), création/gestion des terrains
  par le propriétaire et validation par l'administrateur (sous-projet 6),
  carte interactive (reportée — voir §Décisions).

### La couture avec le sous-projet 3

La génération des créneaux accepte un ensemble de créneaux **déjà pris** :

```ts
generateSlots({ horaires, date, dureeCreneauMinutes, taken }) → Slot[]
```

Dans ce sous-projet, `taken` est toujours vide (aucune réservation n'existe).
Le sous-projet 3 introduira le modèle `Reservation` et alimentera `taken`, sans
avoir à réécrire la logique de génération.

## Décisions techniques

| Sujet | Décision | Raison |
|---|---|---|
| Disponibilités | Le propriétaire définit des **horaires d'ouverture** par jour de semaine + une **durée de créneau**. Les créneaux sont générés, pas saisis un par un. | Correspond au fonctionnement réel des complexes ; évite une saisie fastidieuse |
| Données terrain | **Seed** avec des terrains tunisiens réalistes | La création par le propriétaire arrive au sous-projet 6 |
| Carte | **Liste seulement**. Les coordonnées GPS sont stockées dès maintenant. | Valider le modèle de données avant d'ajouter une dépendance cartographique |
| Prix | Entier, en **millimes** (1 TND = 1000 millimes) | Jamais de flottants pour de la monnaie |
| Fuseau horaire | Tout en heure locale **Africa/Tunis** (UTC+1, sans heure d'été). Horaires stockés en `"HH:MM"`. | Pas d'aller-retour UTC : c'est là que ce genre de système casse |
| Filtrage par heure | Une requête SQL puis filtrage en mémoire | À l'échelle des données de seed c'est suffisant ; indexer maintenant serait de la spéculation |

## Modèle de données

```prisma
enum TerrainType {
  gazon_synthetique
  gazon_naturel
  beton
}

enum TerrainFormat {
  cinq   // 5 contre 5
  sept   // 7 contre 7
  onze   // 11 contre 11
}

enum TerrainStatut {
  actif
  en_attente
  suspendu
}

model Terrain {
  id          String  @id @default(cuid())
  nom         String
  description String?
  adresse     String
  ville       String
  latitude    Float?
  longitude   Float?

  type   TerrainType
  format TerrainFormat

  /// Prix d'un créneau, en millimes (1 TND = 1000 millimes).
  prixParCreneau      Int
  dureeCreneauMinutes Int @default(90)

  equipements String[]  // vestiaires, douches, eclairage, parking...
  photos      String[]  // URLs

  statut TerrainStatut @default(actif)

  /// Propriétaire. Null pour les terrains de démonstration (seed) ; la gestion
  /// par le propriétaire arrive au sous-projet 6.
  ownerId String?
  owner   User?   @relation(fields: [ownerId], references: [id], onDelete: SetNull)

  horaires TerrainHoraire[]

  createdAt DateTime @default(now())

  @@index([ville])
  @@index([statut])
}

model TerrainHoraire {
  id        String  @id @default(cuid())
  terrainId String
  terrain   Terrain @relation(fields: [terrainId], references: [id], onDelete: Cascade)

  /// 0 = dimanche … 6 = samedi (aligné sur Date.getDay()).
  jourSemaine Int
  /// Heure locale Africa/Tunis, format "HH:MM".
  ouvre String
  ferme String

  @@index([terrainId, jourSemaine])
}
```

`User` reçoit la relation inverse `terrains Terrain[]`.

Plusieurs lignes `TerrainHoraire` par terrain et par jour sont autorisées : cela
permet une coupure (matin / soir) sans changer le schéma. Un jour sans ligne =
terrain fermé ce jour-là.

## Logique métier : génération des créneaux

Module : `src/lib/terrains/slots.ts` — **fonction pure, sans accès base**.

```ts
type Slot = {
  debut: string;   // "18:00", heure locale
  fin: string;     // "19:30"
  disponible: boolean;
};

generateSlots({
  horaires,             // TerrainHoraire[] du terrain
  date,                 // jour demandé
  dureeCreneauMinutes,
  taken,                // créneaux déjà réservés — vide dans ce sous-projet
  maintenant,           // injecté, pour tester le filtrage du passé
}): Slot[]
```

Règles :

1. On ne retient que les `horaires` dont `jourSemaine` correspond au jour de
   `date`. Aucun horaire → aucun créneau (terrain fermé).
2. Les créneaux s'enchaînent depuis `ouvre` par pas de `dureeCreneauMinutes`.
3. Un créneau qui **dépasse** `ferme` n'est pas produit (pas de créneau partiel).
4. Si `date` est aujourd'hui, les créneaux déjà commencés sont exclus.
5. Si `date` est dans le passé, aucun créneau.
6. Un créneau présent dans `taken` est produit avec `disponible: false`
   (affiché mais non réservable — l'utilisateur voit que le terrain est occupé).

`maintenant` est un paramètre injecté et non `new Date()` : c'est ce qui rend
les règles 4 et 5 testables de façon déterministe.

## Pages

| Route | Contenu |
|---|---|
| `/terrains` | Liste + filtres : ville, date, heure, format, prix maximum. Chaque carte : photo, nom, ville, format, prix, nombre de créneaux libres. |
| `/terrains/[id]` | Photos, description, adresse, équipements, tarif, et les créneaux du jour sélectionné (sélecteur de date). |

Les deux remplacent les pages stub du sous-projet 1. La navigation mobile basse
existante reste inchangée.

Le bouton « Réserver » est affiché sur un créneau libre mais **désactivé**, avec
la mention « Réservation bientôt disponible » — il sera activé au sous-projet 3.

## API

| Route | Réponse |
|---|---|
| `GET /api/terrains?ville=&date=&heure=&format=&prixMax=` | Liste des terrains `actif` correspondants, avec le nombre de créneaux libres pour la date demandée |
| `GET /api/terrains/[id]?date=` | Détail du terrain + créneaux pour la date |

Toutes les routes sont **publiques** (pas de session requise) : chercher un
terrain doit être possible avant de créer un compte, conformément au parcours A
de `plan.md`.

Validation des paramètres par zod, messages d'erreur en français. Un terrain
introuvable ou non `actif` renvoie 404.

## Données de seed

`prisma/seed.ts` — terrains réalistes à Tunis, Ariana, Sfax et Sousse, avec des
horaires variés (dont un terrain fermé un jour de la semaine, pour exercer la
règle 1). Script idempotent, relançable via `npm run db:seed`.

Les photos utilisent des URLs d'images libres ou des placeholders locaux — aucun
téléversement d'image dans ce sous-projet.

## Tests

- **Unitaires (le cœur)** : `generateSlots` — jour fermé, créneau partiel en fin
  de journée, filtrage du passé avec `maintenant` injecté, date passée, créneaux
  `taken`, horaires coupés matin/soir.
- **Intégration** : les deux routes API contre la base de test — filtres,
  terrain inexistant, terrain non `actif`, date invalide.
- **Composants** : carte terrain, filtres, affichage des créneaux.
- **TDD** : test en échec avant l'implémentation pour toute unité de logique.

## Contraintes héritées du sous-projet 1

- Copie visible en **français**.
- Tailwind, **mobile-first**.
- Prisma + PostgreSQL, `fileParallelism: false` (base de test partagée).
- Corps de requête JSON parsé via `parseJsonBody` (helper existant).
- Commit après chaque tâche verte.
