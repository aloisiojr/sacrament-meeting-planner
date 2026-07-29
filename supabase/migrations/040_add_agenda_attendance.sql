-- Migration 040: add the sacrament-meeting attendance count to sunday_agendas (v2.0).
-- ADDITIVE ONLY — safe for live v1.0 clients: adds a nullable INTEGER column that older
-- clients simply ignore. No data is dropped and no existing column changes.
--
-- Stores the "Frequência da Reunião Sacramental" (attendance) recorded for a past Sunday.
-- NULL means "not yet recorded". Apply at the v2 cutover (with a DB backup).

ALTER TABLE sunday_agendas ADD COLUMN IF NOT EXISTS attendance INTEGER;
