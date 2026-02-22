-- Migration 018: Add has_second_speech column to sunday_agendas
-- Feature: F118 (CR-181)
--
-- This is a non-destructive, additive migration.
-- DEFAULT true preserves current behavior: all existing agendas
-- have the 2nd speech enabled by default.
-- The column follows existing RLS on sunday_agendas (ward_id match).

ALTER TABLE sunday_agendas
  ADD COLUMN has_second_speech BOOLEAN NOT NULL DEFAULT true;
