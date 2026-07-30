-- Migration 043: remove the collection-visibility feature (v2.0). See ADR 004.
-- BREAKING — governed by the ADR 001 forced-update cutover: v2 makes every general collection/topic
-- always available, so the per-ward visibility table is no longer used. Apply at the v2 cutover.
-- Speech snapshots (topic_title/link/collection) are unaffected.

DROP TABLE IF EXISTS ward_collection_config;
