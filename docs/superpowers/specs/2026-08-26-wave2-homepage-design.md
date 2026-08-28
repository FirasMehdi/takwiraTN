# Design — Sous-projet Wave 2 : Refonte de la page d'accueil (Takwria TN)

Date : 2026-08-26
Statut : Approuvé pour planification (brief fourni directement par le contrôleur, sans session de brainstorming — cf. Process de la mission)

## Contexte

L'application Takwria TN est en production : authentification, recherche de
terrains, réservations, matchs, coéquipiers/messagerie, espace propriétaire et
administration existent déjà (sous-projets des vagues précédentes). La page
d'accueil (`src/app/page.tsx`), elle, est restée un stub minimal du
sous-projet 1 (fondations) : un titre, une accroche joueur, et deux boutons
(`/terrains`, `/matchs`). Elle ne présente la plateforme qu'à un seul public
(joueurs) et n'affiche aucune donnée réelle.

En parallèle de ce sous-projet, un autre sous-projet de la même vague
travaille sur le flux d'inscription propriétaire (potentiellement la lecture
d'un paramètre `?type=proprietaire` sur `/inscription`). Les deux
sous-projets sont indépendants et fusionnent séparément dans `main` ; ce
sous-projet ne dépend d'aucun changement de l'autre pour fonctionner.

## Objectif

Remplacer entièrement la page d'accueil par une vraie page d'atterrissage qui :
- explique la plateforme aux deux publics (joueurs et propriétaires de terrains) ;
- affiche deux appels à l'action de inscription distincts, un par public ;
- affiche des statistiques réelles issues de la base de données (pas de
  chiffres inventés) ;
- reste visuellement cohérente avec le reste de l'application (mêmes
  couleurs `primary`/`primary-dark`/`accent`/`anthracite`, mêmes
  conventions de carte/arrondi/espacement que `TerrainCard`, mêmes
  gabarits `main` pleine largeur `bg-gray-50` que `/terrains`,
  `/inscription`, etc.).

## Frontière de périmètre

- **Inclus** : `src/app/page.tsx`, nouveaux composants sous
  `src/components/homepage/**`, nouvelle fonction de lecture seule
  `src/lib/homepage/queries.ts`.
- **Exclu** (appartient à d'autres sous-projets, ne pas toucher) :
  `src/app/admin/**`, `src/lib/admin/**`, `src/app/proprietaire/**`,
  `src/lib/terrains/gestion.ts`, `src/lib/matchs/queries.ts`,
  `src/app/matchs/**`, `src/components/matchs/**`, `src/middleware.ts`,
  `tests/setup/testDb.ts`, `src/lib/validation/auth.ts`,
  `src/app/api/inscription/route.ts`, et le flux d'inscription
  propriétaire lui-même (la page d'accueil ne fait que pointer vers
  `/inscription?type=proprietaire` — elle ne dépend pas de la façon dont
  cette page traite le paramètre, ni ne la modifie).

## Décisions de conception

| Sujet | Décision | Raison |
|---|---|---|
| Structure fichiers | `src/app/page.tsx` (composition, server component async) + 4 composants sous `src/components/homepage/` (`HeroSection`, `StatsSection`, `AudienceSection`, `HowItWorksSection`) + `src/lib/homepage/queries.ts` | Chaque fichier a une responsabilité unique ; `AudienceSection` est réutilisé pour les deux publics (props `variant: "joueur" \| "proprietaire"`) plutôt que dupliqué |
| Stats terrains | `prisma.terrain.count({ where: { statut: "actif" } })` | Cohérent avec ce que `/terrains` montre réellement au public (`findTerrains` filtre déjà `statut: "actif"`) ; compter les terrains suspendus/en attente serait trompeur |
| Stats matchs | `prisma.match.count()` sans filtre de statut | La stat sert à prouver l'activité de la plateforme ("des matchs s'organisent ici") ; un match annulé reste une preuve d'usage réel, contrairement à un terrain suspendu qui n'est pas réservable |
| Stats joueurs/propriétaires | `prisma.user.count({ where: { role: "joueur" } })` / `{ role: "proprietaire" }` | Directement demandé par le brief |
| CTA propriétaire | `/inscription?type=proprietaire`, libellé "Inscrire mon terrain" | Le paramètre est traité comme une chaîne de requête inoffensive : si le sous-projet parallèle le lit, le formulaire s'adapte ; sinon `/inscription` charge normalement sans erreur |
| CTA joueur | `/inscription`, libellé "Rejoindre en tant que joueur" | Directement demandé par le brief |
| Distinction visuelle des deux publics | Section joueur : carte blanche standard (`border-gray-200`, accents `primary`). Section propriétaire : carte `bg-anthracite text-white` avec accents `accent` (jaune) | Réutilise deux paires de couleurs déjà utilisées ensemble ailleurs dans l'app (le badge `bg-accent text-anthracite` de `TerrainCard`) plutôt que d'inventer une nouvelle palette ; crée une distinction visuelle nette entre les deux parcours sans sortir de la palette Tailwind existante |
| Visuel du hero | Réutilisation de `TerrainIllustration` (déjà utilisée dans `TerrainCard`) comme bannière, avec le badge existant ("⚽ Nouveau à Tunis, Sfax, Sousse et Ariana") repositionné en superposition | Zéro nouvelle image/icône à maintenir ; cohérent avec la consigne de réutiliser les composants d'illustration existants |
| Formatage des nombres | `Number.prototype.toLocaleString("fr-FR")` | Aucun helper de formatage numérique n'existe encore dans le repo pour des entiers simples (`formatPrix` est spécifique aux millimes) ; l'API native suffit, pas besoin d'un nouveau fichier `lib` |
| `layout.tsx` / métadonnées globales | Non modifié | Hors périmètre explicite de la mission ; le contenu de la page elle-même couvre déjà les deux publics |
| Tests de `page.tsx` | Pas de test dédié pour `src/app/page.tsx` | Aucune autre page (`/terrains`, `/inscription`, …) n'a de test de page direct dans ce repo ; la couverture vient des tests de composants + de la requête, complétée par `npm run build`/`tsc`/lint en vérification finale |

## Modèles de données concernés (lecture seule)

```prisma
enum Role {
  joueur
  proprietaire
  administrateur
}

model User {
  role Role @default(joueur)
  // ...
}

enum TerrainStatut {
  actif
  en_attente
  suspendu
}

model Terrain {
  statut TerrainStatut @default(actif)
  // ...
}

model Match {
  // pas de filtre de statut appliqué pour la stat d'accueil
}
```

## Interface exposée

```ts
// src/lib/homepage/queries.ts
export type StatsAccueil = {
  joueurs: number;
  proprietaires: number;
  terrains: number;
  matchs: number;
};

export async function findStatsAccueil(): Promise<StatsAccueil>;
```

Aucune autre interface publique n'est exposée hors de `src/app/page.tsx` et
`src/components/homepage/**` (composants purement présentationnels, sans
état, sans écriture en base).
