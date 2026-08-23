# Design — Sous-projet 3 : Réservations (Takwria TN)

Date : 2026-08-23
Statut : Approuvé pour planification

## Contexte

Le sous-projet 2 (*Terrains*) a livré la recherche et l'affichage des
disponibilités, avec un bouton « Réserver » volontairement désactivé et une
couture explicite pour ce sous-projet : `generateSlots` accepte déjà un
paramètre `taken` (vide jusqu'ici). La refonte visuelle (sous-projet
précédent, même journée) a posé le langage visuel que ce sous-projet
consomme : badges, carte, bouton d'action.

Ce document couvre le **sous-projet 3 : Réservations** — un joueur connecté
peut réserver un créneau libre et annuler une réservation à venir.

Sous-projets suivants (hors périmètre) : Matchs, Coéquipiers &
Notifications, Espace propriétaire & Administration.

## Objectif

Un joueur trouve un terrain, choisit un créneau, réserve — et peut annuler
depuis son tableau de bord. Pas de paiement en ligne (paiement sur place,
décision produit actuelle). Pas de vue propriétaire (reportée).

## Frontière de périmètre

- **Inclus** : modèle `Reservation`, protection anti-double-réservation,
  API de création et d'annulation, sélecteur de créneau interactif avec étape
  de confirmation, liste « mes réservations » sur `/tableau-de-bord`,
  annulation avec délai de carence.
- **Exclu** : paiement, vue/gestion côté propriétaire, notifications
  (e-mail/push) de confirmation ou d'annulation, modification d'une
  réservation existante (seule l'annulation est possible — pour changer de
  créneau, l'utilisateur annule puis réserve à nouveau).

## Décisions produit

| Sujet | Décision | Raison |
|---|---|---|
| Paiement | Aucun — réservation = engagement, paiement sur place | Aucun fournisseur de paiement configuré ; décision explicite de l'utilisateur |
| Annulation | Possible jusqu'à **24h avant** le début du créneau | Délai suffisant pour que le terrain puisse être reproposé ; décision explicite |
| Confirmation | Cliquer un créneau libre affiche un panneau de confirmation (« Réserver jeudi 19:30 ? ») avant l'envoi | Évite qu'un clic accidentel crée une réservation |
| Visibilité | La recherche et la consultation restent publiques ; la réservation exige une session | Cohérent avec le sous-projet 2 (« chercher avant de créer un compte ») |
| Redirection si déconnecté | Clic sur un créneau alors que non connecté → redirection vers `/connexion?callbackUrl=...` (réutilise `safeCallbackUrl` existant), retour automatique sur la fiche terrain après connexion | Pas de blocage silencieux ; réutilise un mécanisme déjà durci en sécurité |
| Vue propriétaire | Reportée | Décision explicite ; le rôle `proprietaire` existe déjà dans le schéma mais n'a aucune UI |

## Modèle de données

```prisma
enum ReservationStatut {
  confirmee
  annulee
}

model Reservation {
  id        String  @id @default(cuid())
  terrainId String
  terrain   Terrain @relation(fields: [terrainId], references: [id], onDelete: Cascade)
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  /// "YYYY-MM-DD", heure locale Africa/Tunis — même convention que Terrain/slots.
  date String
  /// "HH:MM" — doit correspondre exactement à un `Slot.debut` généré pour ce
  /// terrain à cette date.
  heureDebut String
  heureFin   String

  statut ReservationStatut @default(confirmee)

  createdAt  DateTime  @default(now())
  canceledAt DateTime?

  @@index([userId])
  @@index([terrainId, date])
}
```

`Terrain` et `User` reçoivent la relation inverse `reservations
Reservation[]`.

### Anti-double-réservation

Une contrainte Prisma `@@unique` classique ne suffit pas : après annulation,
le même créneau doit redevenir réservable par quelqu'un d'autre, donc
l'unicité ne doit porter que sur les réservations **actives**. PostgreSQL
supporte les index uniques partiels ; Prisma ne les exprime pas nativement
dans le schéma. Suivre le même principe déjà appliqué deux fois dans ce
projet (migration Terrain, migration sessionVersion) : laisser
`prisma migrate dev` générer la migration de base, puis l'étendre à la main
avec :

```sql
CREATE UNIQUE INDEX "Reservation_slot_actif_key"
  ON "Reservation" ("terrainId", "date", "heureDebut")
  WHERE "statut" = 'confirmee';
```

C'est la garantie de dernier recours contre une course entre deux requêtes
simultanées sur le même créneau — la requête perdante reçoit une violation de
contrainte, que l'API traduit en `409`. La vérification applicative
(relire les créneaux disponibles avant d'insérer) reste la première ligne de
défense pour les cas normaux ; l'index partiel couvre la course.

## API

| Route | Comportement |
|---|---|
| `POST /api/terrains/[id]/reservations` | Corps `{date, heureDebut}`. Session requise (401 sinon). Revalide côté serveur que le terrain existe et est `actif`, que `date`/`heureDebut` correspondent à un créneau réellement généré et disponible pour cette date (ne jamais faire confiance à ce que le client affichait). Crée la réservation. `201` avec la réservation créée, `409` si le créneau vient d'être pris (course perdue ou créneau déjà réservé), `400` si `date`/`heureDebut` invalides ou ne correspondent à aucun créneau réel, `404` si terrain introuvable/inactif. |
| `POST /api/reservations/[id]/annuler` | Session requise. La réservation doit appartenir à l'utilisateur (404 sinon, jamais 403 — ne pas révéler l'existence d'une réservation d'autrui, même schéma de collision que le 404 terrain inactif du sous-projet 2). `409` si moins de 24h avant `date`+`heureDebut`. Marque `statut: annulee`, `canceledAt: now()`. |

Les deux routes réutilisent `parseJsonBody` et les schémas zod existants
comme convention établie. Messages d'erreur en français.

## Couture avec le sous-projet 2

`findTerrains`/`findTerrainById` (`src/lib/terrains/queries.ts`) reçoivent le
paramètre `taken` en dur à `[]` avec un commentaire l'annonçant. Ce
sous-projet remplace ce `[]` par une requête réelle sur `Reservation` (statut
`confirmee`, même terrain, même date) — `generateSlots` lui-même ne change
pas : c'est exactement la couture prévue au sous-projet 2.

## Pages

| Route | Changement |
|---|---|
| `/terrains/[id]` | Le sélecteur de créneaux devient un composant client interactif : clic sur un créneau libre → panneau de confirmation → envoi. Créneau pris ou passé reste non cliquable (déjà le cas visuellement). Le bouton « Réservation bientôt disponible » disparaît, remplacé par le vrai flux. |
| `/tableau-de-bord` | Remplace le texte de substitution par la liste des réservations de l'utilisateur : à venir (avec bouton « Annuler », désactivé avec explication visible si dans la fenêtre des 24h — même idiome que le bouton désactivé du sous-projet 2) et passées (lecture seule, sans action). |

## Tests

- **Unitaires** : validation zod des payloads de réservation/annulation.
- **Intégration (le cœur)** :
  - Créer une réservation sur un créneau libre → apparaît dans `taken` pour
    une requête `findTerrains`/`findTerrainById` suivante.
  - Tenter de réserver un créneau déjà pris → `409`.
  - **Concurrence** : deux requêtes de réservation simultanées sur le même
    créneau → exactement une réussit, l'autre reçoit `409` (test qui
    déclenche réellement les deux requêtes en parallèle contre la vraie base
    de test, pas un mock — c'est l'index partiel qui doit être prouvé, pas la
    logique applicative seule).
  - Annuler une réservation à plus de 24h → succès, le créneau redevient
    disponible.
  - Annuler à moins de 24h → `409`.
  - Annuler la réservation d'un autre utilisateur → `404`.
  - Réserver sans session → `401`.
- **Composants** : sélecteur de créneau (états libre / sélectionné /
  confirmation / pris), liste de réservations (à venir / passée / annulation
  désactivée).

## Contraintes héritées

- Copie en français.
- Mobile-first.
- Heure locale Africa/Tunis partout, `TZ` déjà documenté (README, sous-projet
  Terrains).
- `fileParallelism: false` (base de test partagée) — le test de concurrence
  ci-dessus doit néanmoins réellement paralléliser ses deux requêtes HTTP
  internes ; c'est le parallélisme des *fichiers de test* vitest qui reste
  désactivé, pas celui des requêtes à l'intérieur d'un même test.
- `npm test`, `npm run lint`, `npm run build` verts à chaque tâche.
