# Plan du site web *Takwria TN*

## 1. Vision du projet

*Takwria TN* sera une plateforme tunisienne qui permet aux passionnés de football de trouver un terrain, réserver un créneau, créer ou rejoindre un match et rencontrer des coéquipiers selon leur ville, leur niveau et leur poste.

**Proposition de valeur :** « Trouve ton terrain. Forme ton équipe. Joue ton match. »


Le site devra être simple à utiliser sur téléphone, car la majorité des utilisateurs chercheront probablement un terrain ou un match depuis leur mobile.

## 2. Types d’utilisateurs

| Utilisateur | Besoins principaux |
|---|---|
| Joueur | Créer un compte, consulter les terrains, rejoindre un match et trouver des coéquipiers |
| Organisateur | Créer un match, réserver un terrain et inviter ou accepter des joueurs |
| Propriétaire de terrain | Ajouter ses terrains, gérer les disponibilités et recevoir les réservations |
| Administrateur | Valider les terrains, gérer les utilisateurs, les matchs et les signalements |

## 3. Pages principales du site

| Page | Contenu et fonctionnalités |
|---|---|
| Accueil | Présentation de Takwria TN, recherche rapide par ville, date et heure |
| Inscription | Création d’un compte avec nom, téléphone ou e-mail, mot de passe et ville |
| Connexion | Adresse e-mail ou numéro de téléphone, mot de passe et récupération du compte |
| Terrains disponibles | Liste ou carte des terrains avec prix, adresse, type de terrain, équipements et créneaux libres |
| Détail d’un terrain | Photos, description, localisation, horaires, tarifs, avis et bouton « Réserver » |
| Réservation | Choix de la date, de l’heure, de la durée et confirmation de la réservation |
| Matchs disponibles | Matchs ouverts avec ville, date, heure, niveau, nombre de joueurs recherchés et poste demandé |
| Créer un match | Formulaire permettant de choisir le terrain, le créneau, le niveau et le nombre de joueurs |
| Trouver des coéquipiers | Recherche par ville, niveau, poste, disponibilité et préférence de jeu |
| Profil joueur | Photo, prénom, ville, poste, niveau, historique des matchs et évaluations |
| Tableau de bord | Réservations, matchs créés, matchs rejoints, notifications et messages |
| Espace propriétaire | Gestion des terrains, créneaux, tarifs, réservations et revenus |
| Administration | Modération des comptes, terrains, annonces, avis et signalements |

## 4. Parcours utilisateur principaux

### Parcours A : réserver un terrain

L’utilisateur arrive sur la page d’accueil, choisit sa ville, sa date et son horaire, puis consulte les terrains disponibles. Il ouvre la fiche d’un terrain, sélectionne un créneau et se connecte ou crée un compte. Après confirmation, la réservation apparaît dans son tableau de bord et une notification lui est envoyée.

### Parcours B : créer un match et trouver des joueurs

L’utilisateur connecté sélectionne « Créer un match », choisit un terrain déjà réservé ou disponible, indique le format du match — par exemple 5 contre 5 ou 7 contre 7 — puis renseigne la date, l’heure, le niveau et le nombre de joueurs recherchés. Le match devient visible dans la liste publique. Les autres joueurs peuvent demander à rejoindre la partie.

### Parcours C : rejoindre un match

Le joueur filtre les matchs par ville, date, niveau ou poste. Il consulte les détails du match, notamment le nombre de places restantes, puis sélectionne « Rejoindre ». L’organisateur reçoit la demande et peut l’accepter automatiquement ou manuellement, selon le réglage choisi.

### Parcours D : devenir propriétaire de terrain

Le propriétaire crée un compte professionnel, ajoute les informations de son complexe sportif, téléverse des photos, indique les tarifs et définit les créneaux disponibles. L’administrateur valide le terrain avant sa publication sur la plateforme.

## 5. Fonctionnalités essentielles du MVP

La première version devra se concentrer sur les fonctionnalités indispensables :

| Priorité | Fonctionnalité |
|---|---|
| Très haute | Inscription, connexion et récupération du mot de passe |
| Très haute | Recherche de terrains par ville, date et horaire |
| Très haute | Affichage des créneaux disponibles |
| Très haute | Réservation d’un terrain |
| Très haute | Création et gestion du profil joueur |
| Haute | Création d’un match |
| Haute | Rejoindre un match ouvert |
| Haute | Recherche de coéquipiers |
| Haute | Notifications de confirmation et de demande de participation |
| Moyenne | Avis et évaluations |
| Moyenne | Messagerie entre joueurs |
| Moyenne | Paiement en ligne |

Pour lancer rapidement le service, le paiement peut d’abord être confirmé manuellement ou directement auprès du terrain. Le paiement en ligne pourra être ajouté dans une deuxième version après validation du fonctionnement de la plateforme.

## 6. Informations à enregistrer

La base de données devra principalement contenir les éléments suivants :

| Donnée | Informations prévues |
|---|---|
| Utilisateur | Nom, e-mail, téléphone, mot de passe sécurisé, ville, rôle et statut |
| Profil joueur | Photo, âge facultatif, poste, niveau, pied préféré, disponibilité et présentation |
| Terrain | Nom, adresse, ville, coordonnées GPS, type, dimensions, prix, photos et équipements |
| Disponibilité | Terrain, date, heure de début, heure de fin et statut du créneau |
| Réservation | Utilisateur, terrain, date, horaire, prix, statut et référence |
| Match | Organisateur, terrain, date, heure, niveau, format, places disponibles et statut |
| Participation | Joueur, match, statut de la demande et date de participation |
| Avis | Auteur, terrain ou joueur évalué, note, commentaire et date |
| Notification | Destinataire, type, message, statut lu/non lu et date |

## 7. Règles importantes de fonctionnement

Un créneau déjà réservé ne devra plus apparaître comme disponible. La plateforme devra empêcher deux utilisateurs de réserver le même terrain à la même date et à la même heure. Une réservation annulée devra libérer le créneau selon la politique d’annulation définie par l’administrateur ou le propriétaire.

Les profils devront pouvoir être signalés. Les propriétaires devront valider les informations de leur terrain. Les mots de passe devront être stockés de manière sécurisée et les informations personnelles ne devront pas être affichées publiquement sans autorisation.

## 8. Proposition d’interface et d’identité visuelle

L’identité de *Takwria TN* peut s’appuyer sur une image sportive, énergique et locale. Une palette composée de *vert terrain*, *blanc*, *noir anthracite* et d’une couleur d’accent *rouge ou jaune* conviendrait bien à l’univers du football.

| Élément | Proposition |
|---|---|
| Logo | Nom « Takwria TN » accompagné d’un ballon ou d’un terrain stylisé |
| Couleur principale | Vert profond ou vert gazon |
| Bouton principal | « Réserver un terrain » |
| Bouton secondaire | « Trouver des joueurs » |
| Ton rédactionnel | Direct, sportif, convivial et accessible |
| Navigation mobile | Accueil, Terrains, Matchs, Joueurs, Profil |

La page d’accueil devrait mettre immédiatement en avant deux actions : *« Réserver un terrain »* et *« Rejoindre un match »*. Une section « Matchs proches de vous » et une section « Terrains populaires » aideraient également les utilisateurs à agir rapidement.

## 9. Structure technique recommandée

Pour un site moderne et évolutif, l’architecture peut être composée d’une interface web responsive, d’une API serveur, d’une base de données relationnelle et d’un espace d’administration. L’authentification devra gérer les rôles joueur, organisateur, propriétaire et administrateur.

Une stack appropriée serait une interface *React avec TypeScript*, un serveur *Node.js*, une base de données *MySQL ou PostgreSQL*, un stockage d’images pour les photos des terrains et un système de notifications par e-mail ou SMS. Une carte interactive pourra être ajoutée pour localiser les terrains.

## 10. Roadmap de réalisation

| Étape | Résultat attendu |
|---|---|
| Étape 1 | Maquettes de l’accueil, de la connexion, des terrains et du profil |
| Étape 2 | Création des comptes et gestion des profils |
| Étape 3 | Ajout des terrains et affichage des disponibilités |
| Étape 4 | Système de réservation et tableau de bord |
| Étape 5 | Création et participation aux matchs |
| Étape 6 | Recherche de coéquipiers et notifications |
| Étape 7 | Espace propriétaire et administration |
| Étape 8 | Tests sur mobile, correction des erreurs et mise en ligne |

## 11. Version MVP recommandée

La version initiale de Takwria TN devrait comprendre une page d’accueil, une page de connexion et d’inscription, la recherche des terrains, les fiches détaillées, les réservations, les profils joueurs, la création de matchs et la possibilité de rejoindre une partie.

Les fonctionnalités comme la messagerie avancée, les avis, les paiements en ligne, les promotions et les applications mobiles natives peuvent être développées après le lancement. Cette approche permettra de tester l’intérêt des utilisateurs avec un produit plus rapide à construire et plus facile à améliorer.

## 12. Résumé du concept

*Takwria TN* doit devenir un point de rencontre entre joueurs, organisateurs et propriétaires de terrains. Le site ne doit pas se limiter à la réservation : il doit aussi résoudre le problème courant des joueurs qui ne trouvent pas assez de coéquipiers pour compléter une équipe.

La priorité est donc de proposer une expérience très simple : *choisir une ville, trouver un terrain ou un match, réserver ou rejoindre, puis recevoir une confirmation*.