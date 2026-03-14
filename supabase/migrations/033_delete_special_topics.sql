-- Migration 033: Delete 'Temas Especiais' / 'Special Topics' / 'Temas Especiales'
-- collections from general_collections. CASCADE on general_topics.collection_id
-- and ward_collection_config.collection_id handles cleanup automatically.

DELETE FROM general_collections
WHERE name IN ('Temas Especiais', 'Special Topics', 'Temas Especiales');
