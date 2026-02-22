-- =============================================================================
-- 019_seed_en_es_collections.sql
-- Seed general_collections and general_topics for 'en' and 'es' languages
-- Mirrors pt-BR collection structure with translated names and topics
-- CR-206 (F141)
-- =============================================================================

-- English (en) collections and topics
DO $$
DECLARE
  v_col_faith UUID;
  v_col_family UUID;
  v_col_service UUID;
  v_col_gospel UUID;
  v_col_covenants UUID;
BEGIN
  -- Idempotency guard: skip if English collections already exist
  IF EXISTS (SELECT 1 FROM general_collections WHERE language = 'en') THEN
    RAISE NOTICE 'English collections already exist, skipping';
    RETURN;
  END IF;

  -- Insert collections
  INSERT INTO general_collections (name, language) VALUES ('Faith and Testimony', 'en') RETURNING id INTO v_col_faith;
  INSERT INTO general_collections (name, language) VALUES ('Family and Relationships', 'en') RETURNING id INTO v_col_family;
  INSERT INTO general_collections (name, language) VALUES ('Service and Charity', 'en') RETURNING id INTO v_col_service;
  INSERT INTO general_collections (name, language) VALUES ('Gospel Principles', 'en') RETURNING id INTO v_col_gospel;
  INSERT INTO general_collections (name, language) VALUES ('Covenants and Ordinances', 'en') RETURNING id INTO v_col_covenants;

  -- Topics for Faith and Testimony
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_faith, 'Faith in Jesus Christ', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/faith-in-jesus-christ');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_faith, 'Prayer and Personal Revelation', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/prayer');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_faith, 'Repentance and the Atonement', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/repentance');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_faith, 'Scriptures and Scripture Study', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/scriptures');

  -- Topics for Family and Relationships
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_family, 'The Family: A Proclamation to the World', 'https://www.churchofjesuschrist.org/study/scriptures/the-family-a-proclamation-to-the-world/the-family-a-proclamation-to-the-world');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_family, 'Marriage and Family', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/marriage');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_family, 'Parenthood and Raising Children', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/family');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_family, 'Honoring Parents', NULL);

  -- Topics for Service and Charity
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_service, 'Charity and Love', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/charity');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_service, 'Service and Ministering', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/service');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_service, 'Missionary Work', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/missionary-work');

  -- Topics for Gospel Principles
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_gospel, 'Obedience and Keeping Commandments', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/obedience');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_gospel, 'Gratitude and Thankfulness', NULL);
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_gospel, 'Humility and Meekness', NULL);
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_gospel, 'Hope and Optimism', NULL);

  -- Topics for Covenants and Ordinances
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_covenants, 'Baptism and Confirmation', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/baptism');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_covenants, 'The Sacrament', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/sacrament');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_covenants, 'Temples and Temple Work', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/temples');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_covenants, 'Tithing and Offerings', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/tithing');
END $$;

-- Spanish (es) collections and topics
DO $$
DECLARE
  v_col_fe UUID;
  v_col_familia UUID;
  v_col_servicio UUID;
  v_col_evangelio UUID;
  v_col_convenios UUID;
BEGIN
  -- Idempotency guard: skip if Spanish collections already exist
  IF EXISTS (SELECT 1 FROM general_collections WHERE language = 'es') THEN
    RAISE NOTICE 'Spanish collections already exist, skipping';
    RETURN;
  END IF;

  -- Insert collections
  INSERT INTO general_collections (name, language) VALUES ('Fe y Testimonio', 'es') RETURNING id INTO v_col_fe;
  INSERT INTO general_collections (name, language) VALUES ('Familia y Relaciones', 'es') RETURNING id INTO v_col_familia;
  INSERT INTO general_collections (name, language) VALUES ('Servicio y Caridad', 'es') RETURNING id INTO v_col_servicio;
  INSERT INTO general_collections (name, language) VALUES ('Principios del Evangelio', 'es') RETURNING id INTO v_col_evangelio;
  INSERT INTO general_collections (name, language) VALUES ('Convenios y Ordenanzas', 'es') RETURNING id INTO v_col_convenios;

  -- Topics for Fe y Testimonio
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_fe, 'Fe en Jesucristo', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/faith-in-jesus-christ?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_fe, 'La oracion y la revelacion personal', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/prayer?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_fe, 'El arrepentimiento y la Expiacion', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/repentance?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_fe, 'Las Escrituras y el estudio de las Escrituras', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/scriptures?lang=spa');

  -- Topics for Familia y Relaciones
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_familia, 'La Familia: Una Proclamacion para el Mundo', 'https://www.churchofjesuschrist.org/study/scriptures/the-family-a-proclamation-to-the-world/the-family-a-proclamation-to-the-world?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_familia, 'El matrimonio y la familia', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/marriage?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_familia, 'La crianza de los hijos', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/family?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_familia, 'Honrar a los padres', NULL);

  -- Topics for Servicio y Caridad
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_servicio, 'La caridad y el amor', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/charity?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_servicio, 'El servicio y la ministracion', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/service?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_servicio, 'La obra misional', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/missionary-work?lang=spa');

  -- Topics for Principios del Evangelio
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_evangelio, 'La obediencia y guardar los mandamientos', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/obedience?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_evangelio, 'La gratitud y el agradecimiento', NULL);
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_evangelio, 'La humildad y la mansedumbre', NULL);
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_evangelio, 'La esperanza y el optimismo', NULL);

  -- Topics for Convenios y Ordenanzas
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_convenios, 'El bautismo y la confirmacion', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/baptism?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_convenios, 'La Santa Cena', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/sacrament?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_convenios, 'Los templos y la obra del templo', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/temples?lang=spa');
  INSERT INTO general_topics (collection_id, title, link) VALUES (v_col_convenios, 'El diezmo y las ofrendas', 'https://www.churchofjesuschrist.org/study/manual/gospel-topics/tithing?lang=spa');
END $$;
