-- CR-249: Standardize language codes
-- en/en-US -> en-US, es/es-ES -> es-LA in all tables

-- Update hymns table (currently uses en-US, es-ES from import script)
UPDATE hymns SET language = 'es-LA' WHERE language = 'es-ES';
-- en-US hymns are already correct, no change needed

-- Update general_collections table (currently uses en-US, es-ES)
UPDATE general_collections SET language = 'es-LA' WHERE language = 'es-ES';
-- en-US collections are already correct, no change needed

-- Update wards table (currently uses en, es from app)
UPDATE wards SET language = 'en-US' WHERE language = 'en';
UPDATE wards SET language = 'es-LA' WHERE language = 'es';
