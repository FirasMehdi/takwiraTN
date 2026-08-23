# Design — Refonte visuelle (Takwria TN)

Date : 2026-08-23
Statut : Approuvé pour planification

## Contexte

Les sous-projets 1 (*Fondations & Authentification*) et 2 (*Terrains*) sont
terminés. L'application est fonctionnelle mais visuellement au niveau
scaffold : Tailwind par défaut, aucune passe de design cohérente. Avant
d'ajouter la réservation (sous-projet 3), ce document couvre une **refonte
visuelle** de l'existant — aucune nouvelle fonctionnalité.

Direction retenue après exploration visuelle avec l'utilisateur : base épurée
(beaucoup de blanc, bordures fines, la couleur au service du contenu) avec
l'or (`accent`, `#F5B301`) réservé comme **signal rare** — badges de
disponibilité, état sélectionné dans le futur sélecteur de créneau — jamais
comme couleur de fond dominante. Le vert (`primary`) reste la couleur
d'action principale et du prix.

## Objectif

Faire ressembler l'application à un produit fini plutôt qu'à un squelette,
sans changer un seul comportement. Poser des fondations visuelles que le
sous-projet Réservations pourra consommer directement (badges de créneau,
bouton d'action principal, cartes) au lieu de les redessiner.

## Frontière de périmètre

- **Inclus** : jetons de thème (`tailwind.config.ts`), page d'accueil, pages
  d'authentification, pages terrains (liste + détail), navigation basse,
  profil, tableau de bord, passe légère sur les pages stub `/joueurs` et
  `/matchs`.
- **Exclu** : toute nouvelle fonctionnalité, tout changement de structure de
  données ou de route, la réservation elle-même (sous-projet suivant), une
  bibliothèque de composants générique (YAGNI — les motifs Tailwind cohérents
  suffisent à ce stade).

## Jetons de thème

Extension de `tailwind.config.ts`, additive uniquement — `primary`,
`anthracite`, `accent` existants ne changent pas de valeur :

| Jeton | Valeur | Usage |
|---|---|---|
| `border-subtle` (couleur) | `#e5e7eb` (gris clair existant en dur dans le code actuel) | Bordures de carte, remplace les valeurs Tailwind par défaut dispersées |
| `surface` | `#fafafa` | Fond de page derrière les cartes blanches (liste de terrains, formulaires) |
| Rayon de carte | `rounded-lg`/`rounded-xl` cohérent | Actuellement mélangé (`rounded`, `rounded-lg`) selon les fichiers |
| Ombre de carte | une seule ombre douce standard | Remplace les `shadow` ad hoc |

Pas de nouvelle police : la police système actuelle reste, seule la mise en
page change.

## Où ça s'applique

| Zone | Changement |
|---|---|
| `/` (accueil) | Actuellement quasi vide. Devient une vraie page d'atterrissage : en-tête avec accroche, CTA vers `/terrains`. |
| `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialiser-mot-de-passe/[token]` | Formulaires dans une carte cohérente (bordure, ombre, largeur max), au lieu du rendu brut actuel. |
| `/terrains` | Cartes conformes aux maquettes validées : badge or « ⚡ N créneaux libres » (ou gris « Complet aujourd'hui » si zéro), prix en vert, bouton bordé vert. |
| `/terrains/[id]` | Même langage visuel ; la zone créneaux est préparée pour le sélecteur interactif du sous-projet Réservations (structure de grille, état visuel « sélectionné » en or déjà stylé même si non encore interactif). |
| Navigation basse (`BottomNav`) | Passe de cohérence visuelle (espacement, état actif) sans changer les routes. |
| `/profil` | Formulaire dans le même style de carte que les pages d'authentification. |
| `/tableau-de-bord` | Cohérence visuelle du conteneur ; le contenu (réservations) arrive au sous-projet suivant — on ne touche pas au texte de substitution ici pour éviter un conflit de fusion avec ce sous-projet. |
| `/joueurs`, `/matchs` | Passe légère : typographie cohérente uniquement (ce sont des stubs hors périmètre, pas de mise en page complète). |

## Contraintes

- Aucun changement de comportement, de route, de schéma de données ou de
  texte fonctionnel (hors ajustements typographiques mineurs justifiés par la
  cohérence).
- Mobile-first, comme l'existant.
- Copie en français, inchangée sauf mention contraire ci-dessus.
- Les tests existants (composants, pages) ne doivent pas se casser sur des
  assertions de classes CSS fragiles — si un test actuel dépend d'une classe
  qui change, l'implémenteur corrige le test en même temps, dans le même
  commit.
- `npm test`, `npm run lint`, `npm run build` verts à chaque tâche.

## Découpage pour l'exécution

Ce sous-projet se prête à une exécution en parallèle : la plupart des zones
du tableau ci-dessus touchent des fichiers disjoints (une page = un ou deux
fichiers, aucune ne dépend du contenu d'une autre). Seuls les jetons de thème
(`tailwind.config.ts`) sont un pré-requis partagé et doivent être posés en
premier, avant de paralléliser le reste.

## Tests

Pas de nouveaux tests fonctionnels (rien de nouveau à tester) — seule
obligation : la suite existante reste verte, et tout test qui assertait sur
une classe CSS désormais différente est mis à jour dans le même commit que le
changement qui le casse.
