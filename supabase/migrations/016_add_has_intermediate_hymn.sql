-- Migration 016: Add has_intermediate_hymn column to sunday_agendas
-- Feature: F095 (CR-152) - Toggle for Intermediate Hymn in Agenda
-- Default true ensures backward compatibility (existing agendas show hymn selector as before)

ALTER TABLE sunday_agendas
  ADD COLUMN has_intermediate_hymn BOOLEAN NOT NULL DEFAULT true;
