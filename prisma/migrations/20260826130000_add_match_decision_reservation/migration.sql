-- Persiste « l'organisateur a tranché la question de la réservation de fin de
-- match » — réserver pour de bon OU refuser explicitement. reservationId seul
-- ne couvre que le premier cas : sans cette colonne, un refus ne laisserait
-- aucune trace et l'invite « Réserver ce créneau ? » réapparaîtrait à chaque
-- consultation de la fiche.
--
-- Purement additif : une colonne nullable, aucune donnée touchée, aucune
-- valeur d'énumération ajoutée ni retirée. Les matchs existants gardent NULL,
-- ce qui est exact pour eux : aucune décision n'a encore été prise.

ALTER TABLE "Match" ADD COLUMN "decisionReservationAt" TIMESTAMP(3);
