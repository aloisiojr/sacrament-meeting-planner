-- ============================================================================
-- SEED (STAGING ONLY) — dados de teste fartos para o app v2.0
-- Rodar no SQL Editor do projeto de staging (nfraidzguordqmbpqkcf).
-- Requer que a 1ª ala já exista (criada pelo fluxo "Criar conta para primeiro
-- usuário de uma Ala"). Executa como postgres → ignora RLS.
-- Idempotente-ish: usa ON CONFLICT onde há UNIQUE; membros/discursos podem
-- duplicar se rodado 2x. Para começar limpo, descomente o bloco CLEAN abaixo.
-- ============================================================================

DO $$
DECLARE
  w UUID;
BEGIN
  SELECT id INTO w FROM wards ORDER BY created_at LIMIT 1;
  IF w IS NULL THEN
    RAISE EXCEPTION 'Nenhuma ala encontrada — crie a 1a ala pelo app antes de seedar.';
  END IF;

  -- ==========================================================================
  -- CLEAN SLATE (opcional) — descomente para zerar dados desta ala antes de seedar
  -- ==========================================================================
  -- DELETE FROM speeches         WHERE ward_id = w;
  -- DELETE FROM sunday_agendas   WHERE ward_id = w;
  -- DELETE FROM sunday_exceptions WHERE ward_id = w;
  -- DELETE FROM notification_queue WHERE ward_id = w;
  -- UPDATE members SET responsible_id = NULL WHERE ward_id = w;
  -- DELETE FROM members          WHERE ward_id = w;

  -- ==========================================================================
  -- WARD SETTINGS — liga orações gerenciadas + templates WhatsApp
  -- ==========================================================================
  UPDATE wards SET
    manage_prayers = true,
    whatsapp_template_speech_1 = COALESCE(whatsapp_template_speech_1,
      'Olá {nome}! Você foi convidado(a) para discursar na reunião sacramental de {data} sobre o tema "{tema}". Você aceita?'),
    whatsapp_template_speech_2 = COALESCE(whatsapp_template_speech_2,
      'Olá {nome}! Confirmando seu discurso na reunião sacramental de {data} sobre "{tema}".'),
    whatsapp_template_opening_prayer = COALESCE(whatsapp_template_opening_prayer,
      'Olá {nome}! Você faria a primeira oração na reunião sacramental de {data}?'),
    whatsapp_template_closing_prayer = COALESCE(whatsapp_template_closing_prayer,
      'Olá {nome}! Você faria a última oração na reunião sacramental de {data}?'),
    whatsapp_template_delegation_wrapper = COALESCE(whatsapp_template_delegation_wrapper,
      'Olá {responsavel}, tudo bom? Temos um convite para {nome}:' || chr(10) || chr(10) || '{mensagem}')
  WHERE id = w;

  -- ==========================================================================
  -- MEMBERS — 28 pessoas com capacidades variadas + delegação
  -- cols: capacidades = preside(dirigir a reunião a partir do bispado),
  --        conduct(dirigir), lead_music(reger), play_piano(piano),
  --        be_recognized(reconhecido no púlpito)
  -- ==========================================================================
  INSERT INTO members (ward_id, full_name, informal_name, country_code, phone,
      can_preside, can_conduct, can_lead_music, can_play_piano, can_be_recognized,
      contact_via_responsible) VALUES
    -- Bispado / liderança (presidir + dirigir)
    (w,'Ricardo Almeida','Ricardo','+55','11987650001', true,  true,  false, false, false, false),
    (w,'Paulo Mendes',   'Paulo',  '+55','11987650002', true,  true,  false, false, false, false),
    (w,'André Souza',    'André',  '+55','11987650003', true,  true,  false, false, false, false),
    (w,'Marcos Oliveira','Marcos', '+55','11987650004', false, true,  false, false, false, false),
    -- Música (piano / reger)
    (w,'Juliana Costa',  'Juliana','+55','11987650005', false, false, false, true,  false, false),
    (w,'Fernanda Rocha', 'Fernanda','+55','11987650006', false, false, true,  true,  false, false),
    (w,'Camila Dias',    'Camila', '+55','11987650007', false, false, true,  false, false, false),
    (w,'Tiago Barros',   'Tiago',  '+55','11987650008', false, false, true,  true,  false, false),
    -- Reconhecidos no púlpito (visitantes / líderes de estaca)
    (w,'Élder Carvalho', 'Carvalho','+55','11987650009', false, false, false, false, true,  false),
    (w,'Bispo Nogueira', 'Nogueira','+55','11987650010', true,  true,  false, false, true,  false),
    -- Membros gerais (discursantes / orações)
    (w,'João Vasconcelos','João',   '+55','11987650011', false, false, false, false, false, false),
    (w,'Ana Ribeiro',    'Ana',     '+55','11987650012', false, false, false, false, false, false),
    (w,'Pedro Gomes',    'Pedro',   '+55','11987650013', false, false, false, false, false, false),
    (w,'Mariana Silva',  'Mariana', '+55','11987650014', false, false, false, false, false, false),
    (w,'Lucas Martins',  'Lucas',   '+55','11987650015', false, false, false, false, false, false),
    (w,'Beatriz Carvalho','Beatriz','+55','11987650016', false, false, false, false, false, false),
    (w,'Rafael Pereira', 'Rafael',  '+55','11987650017', false, false, false, false, false, false),
    (w,'Larissa Nunes',  'Larissa', '+55','11987650018', false, false, false, false, false, false),
    (w,'Gustavo Ramos',  'Gustavo', '+55','11987650019', false, false, false, false, false, false),
    (w,'Patrícia Lopes', 'Patrícia','+55','11987650020', false, false, false, false, false, false),
    (w,'Bruno Cardoso',  'Bruno',   '+55','11987650021', false, false, false, false, false, false),
    (w,'Vanessa Teixeira','Vanessa','+55','11987650022', false, false, false, false, false, false),
    -- Responsáveis (pais) — recebem o contato dos delegados
    (w,'Márcia Ferreira','Márcia',  '+55','11987650023', false, false, false, false, false, false),
    (w,'Roberto Lima',   'Roberto', '+55','11987650026', false, false, false, false, false, false),
    -- Delegados (contato via responsável, sem telefone próprio)
    (w,'Lucas Ferreira', 'Lucas',   '+55', NULL,         false, false, false, false, false, true),
    (w,'Beatriz Ferreira','Bia',    '+55', NULL,         false, false, false, false, false, true),
    (w,'Daniel Ferreira','Daniel',  '+55', NULL,         false, false, false, false, false, true),
    (w,'Sofia Lima',     'Sofia',   '+55', NULL,         false, false, false, false, false, true);

  -- Liga os delegados aos seus responsáveis
  UPDATE members SET responsible_id = (SELECT id FROM members WHERE ward_id=w AND full_name='Márcia Ferreira')
    WHERE ward_id=w AND full_name IN ('Lucas Ferreira','Beatriz Ferreira','Daniel Ferreira');
  UPDATE members SET responsible_id = (SELECT id FROM members WHERE ward_id=w AND full_name='Roberto Lima')
    WHERE ward_id=w AND full_name='Sofia Lima';

  -- ==========================================================================
  -- HYMNS (globais, pt-BR) — regulares + sacramentais (para os seletores)
  -- ==========================================================================
  INSERT INTO hymns (language, number, title, is_sacramental) VALUES
    ('pt-BR', 2,  'O Espírito de Deus',          false),
    ('pt-BR', 21, 'Vinde, Ó Santos',             false),
    ('pt-BR', 26, 'Conduze-nos, Ó Deus',         false),
    ('pt-BR', 35, 'Quão Firme Alicerce',         false),
    ('pt-BR', 46, 'Mais Perto Quero Estar',      false),
    ('pt-BR', 52, 'Ó Meu Pai',                   false),
    ('pt-BR', 66, 'Firmes Segui',                false),
    ('pt-BR', 72, 'Alegres Cantemos',            false),
    ('pt-BR', 85, 'Deus Vos Guarde',             false),
    ('pt-BR', 100,'Israel, Ó Israel',            false),
    ('pt-BR', 128,'Vinde a Cristo',              false),
    ('pt-BR', 140,'Grandioso És Tu',             false),
    -- Sacramentais
    ('pt-BR', 169,'Com Amor e Reverência',       true),
    ('pt-BR', 170,'Enquanto o Pão Partimos',     true),
    ('pt-BR', 174,'Deus, Escuta-nos Orar',       true),
    ('pt-BR', 176,'Jesus, de Amor Divino',       true),
    ('pt-BR', 181,'Cristo, o Cordeiro Santo',    true),
    ('pt-BR', 185,'Reverente, em Silêncio',      true),
    ('pt-BR', 190,'Na Cruz do Calvário',         true),
    ('pt-BR', 193,'Eu Sei Que Vive Meu Senhor',  true)
  ON CONFLICT (language, number) DO NOTHING;

  -- ==========================================================================
  -- GENERAL COLLECTIONS + TOPICS (globais) + ativa para a ala
  -- ==========================================================================
  INSERT INTO general_collections (name, language)
  SELECT 'Conferência Geral — Abril 2026', 'pt-BR'
  WHERE NOT EXISTS (SELECT 1 FROM general_collections WHERE name='Conferência Geral — Abril 2026' AND language='pt-BR');

  INSERT INTO general_topics (collection_id, title, link)
  SELECT c.id, t.title, t.link
  FROM (SELECT id FROM general_collections WHERE name='Conferência Geral — Abril 2026' AND language='pt-BR') c
  CROSS JOIN (VALUES
    ('A Expiação de Jesus Cristo', 'https://www.churchofjesuschrist.org/study/general-conference'),
    ('O Poder do Sacerdócio',      NULL),
    ('Fé para Agir',               NULL),
    ('O Convênio do Batismo',      NULL),
    ('Vencendo o Mundo',           NULL),
    ('A Alegria do Serviço',       NULL),
    ('Ministrar como o Salvador',  NULL),
    ('O Templo e a Família Eterna',NULL)
  ) AS t(title, link)
  WHERE NOT EXISTS (SELECT 1 FROM general_topics gt WHERE gt.collection_id = c.id);

  INSERT INTO ward_collection_config (ward_id, collection_id, active)
  SELECT w, c.id, true
  FROM (SELECT id FROM general_collections WHERE name='Conferência Geral — Abril 2026' AND language='pt-BR') c
  ON CONFLICT (ward_id, collection_id) DO UPDATE SET active = true;

  -- ==========================================================================
  -- WARD TOPICS (temas da ala) — alguns customizados (034 já semeou os default)
  -- ==========================================================================
  INSERT INTO ward_topics (ward_id, title, link, is_default) VALUES
    (w,'A Restauração do Evangelho',    NULL, false),
    (w,'O Livro de Mórmon',             NULL, false),
    (w,'A Palavra de Sabedoria',        NULL, false),
    (w,'O Plano de Salvação',           NULL, false),
    (w,'A Lei do Dízimo',               NULL, false),
    (w,'História da Família e o Templo',NULL, false);

  -- ==========================================================================
  -- SUNDAY EXCEPTIONS — tipos especiais de domingo (regulares não precisam de linha)
  -- ==========================================================================
  INSERT INTO sunday_exceptions (ward_id, date, reason) VALUES
    (w,'2026-07-19','testimony_meeting'),
    (w,'2026-08-16','general_conference'),
    (w,'2026-08-23','stake_conference')
  ON CONFLICT (ward_id, date) DO NOTHING;

  -- ==========================================================================
  -- SPEECHES (pos 0=oração inicial, 1/2/3=discursantes, 4=oração final)
  -- Cobre vários status + delegação. contact_phone = telefone resolvido no snapshot.
  -- ==========================================================================
  INSERT INTO speeches (ward_id, sunday_date, position, member_id, speaker_name,
      speaker_informal_name, speaker_phone, topic_title, topic_link, topic_collection,
      status, assigned_by_role, contact_phone, is_delegated, delegate_for_name) VALUES

    -- 2026-07-05 (passado, REGULAR, completo)
    (w,'2026-07-05',0,(SELECT id FROM members WHERE ward_id=w AND full_name='Ana Ribeiro'),'Ana Ribeiro','Ana','11987650012',NULL,NULL,NULL,'assigned_confirmed','bishopric','11987650012',false,NULL),
    (w,'2026-07-05',1,(SELECT id FROM members WHERE ward_id=w AND full_name='João Vasconcelos'),'João Vasconcelos','João','11987650011','A Fé em Jesus Cristo',NULL,'Temas da Ala','assigned_confirmed','bishopric','11987650011',false,NULL),
    (w,'2026-07-05',2,(SELECT id FROM members WHERE ward_id=w AND full_name='Mariana Silva'),'Mariana Silva','Mariana','11987650014','O Arrependimento',NULL,'Temas da Ala','assigned_confirmed','bishopric','11987650014',false,NULL),
    (w,'2026-07-05',3,(SELECT id FROM members WHERE ward_id=w AND full_name='Rafael Pereira'),'Rafael Pereira','Rafael','11987650017','O Sacerdócio de Melquisedeque',NULL,'Temas da Ala','assigned_confirmed','bishopric','11987650017',false,NULL),
    (w,'2026-07-05',4,(SELECT id FROM members WHERE ward_id=w AND full_name='Pedro Gomes'),'Pedro Gomes','Pedro','11987650013',NULL,NULL,NULL,'assigned_confirmed','bishopric','11987650013',false,NULL),

    -- 2026-07-12 (passado, REGULAR, 2 discursantes)
    (w,'2026-07-12',0,(SELECT id FROM members WHERE ward_id=w AND full_name='Larissa Nunes'),'Larissa Nunes','Larissa','11987650018',NULL,NULL,NULL,'assigned_confirmed','bishopric','11987650018',false,NULL),
    (w,'2026-07-12',1,(SELECT id FROM members WHERE ward_id=w AND full_name='Gustavo Ramos'),'Gustavo Ramos','Gustavo','11987650019','O Poder da Oração',NULL,'Temas da Ala','assigned_confirmed','bishopric','11987650019',false,NULL),
    (w,'2026-07-12',2,(SELECT id FROM members WHERE ward_id=w AND full_name='Patrícia Lopes'),'Patrícia Lopes','Patrícia','11987650020','O Livro de Mórmon',NULL,'Temas da Ala','assigned_confirmed','bishopric','11987650020',false,NULL),
    (w,'2026-07-12',4,(SELECT id FROM members WHERE ward_id=w AND full_name='Bruno Cardoso'),'Bruno Cardoso','Bruno','11987650021',NULL,NULL,NULL,'assigned_confirmed','bishopric','11987650021',false,NULL),

    -- 2026-07-19 (passado, TESTEMUNHO) — só orações, sem discursantes
    (w,'2026-07-19',0,(SELECT id FROM members WHERE ward_id=w AND full_name='Vanessa Teixeira'),'Vanessa Teixeira','Vanessa','11987650022',NULL,NULL,NULL,'assigned_confirmed','bishopric','11987650022',false,NULL),
    (w,'2026-07-19',4,(SELECT id FROM members WHERE ward_id=w AND full_name='João Vasconcelos'),'João Vasconcelos','João','11987650011',NULL,NULL,NULL,'assigned_confirmed','bishopric','11987650011',false,NULL),

    -- 2026-07-26 (esta semana, REGULAR, em andamento — status misturados)
    (w,'2026-07-26',0,(SELECT id FROM members WHERE ward_id=w AND full_name='Ana Ribeiro'),'Ana Ribeiro','Ana','11987650012',NULL,NULL,NULL,'assigned_invited','bishopric','11987650012',false,NULL),
    (w,'2026-07-26',1,(SELECT id FROM members WHERE ward_id=w AND full_name='Lucas Martins'),'Lucas Martins','Lucas','11987650015','O Plano de Salvação',NULL,'Temas da Ala','assigned_confirmed','bishopric','11987650015',false,NULL),
    (w,'2026-07-26',2,(SELECT id FROM members WHERE ward_id=w AND full_name='Beatriz Carvalho'),'Beatriz Carvalho','Beatriz','11987650016','A Família É Ordenada por Deus',NULL,'Temas da Ala','assigned_invited','bishopric','11987650016',false,NULL),
    (w,'2026-07-26',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_assigned',NULL,NULL,false,NULL),
    (w,'2026-07-26',4,(SELECT id FROM members WHERE ward_id=w AND full_name='Pedro Gomes'),'Pedro Gomes','Pedro','11987650013',NULL,NULL,NULL,'assigned_not_invited','bishopric','11987650013',false,NULL),

    -- 2026-08-02 (futuro, REGULAR, planejando — inclui DELEGADO na pos 3)
    (w,'2026-08-02',0,(SELECT id FROM members WHERE ward_id=w AND full_name='Larissa Nunes'),'Larissa Nunes','Larissa','11987650018',NULL,NULL,NULL,'assigned_not_invited','bishopric','11987650018',false,NULL),
    (w,'2026-08-02',1,(SELECT id FROM members WHERE ward_id=w AND full_name='Rafael Pereira'),'Rafael Pereira','Rafael','11987650017','O Templo e a Família Eterna',NULL,'Conferência Geral — Abril 2026','assigned_confirmed','bishopric','11987650017',false,NULL),
    (w,'2026-08-02',2,(SELECT id FROM members WHERE ward_id=w AND full_name='Mariana Silva'),'Mariana Silva','Mariana','11987650014','A Lei do Dízimo',NULL,'Temas da Ala','assigned_invited','bishopric','11987650014',false,NULL),
    (w,'2026-08-02',3,(SELECT id FROM members WHERE ward_id=w AND full_name='Lucas Ferreira'),'Lucas Ferreira','Lucas',NULL,'A Palavra de Sabedoria',NULL,'Temas da Ala','assigned_invited','bishopric','11987650023',true,'Lucas Ferreira'),

    -- 2026-08-09 (futuro, REGULAR, início — com um "gave_up")
    (w,'2026-08-09',0,(SELECT id FROM members WHERE ward_id=w AND full_name='Vanessa Teixeira'),'Vanessa Teixeira','Vanessa','11987650022',NULL,NULL,NULL,'assigned_not_invited','bishopric','11987650022',false,NULL),
    (w,'2026-08-09',1,(SELECT id FROM members WHERE ward_id=w AND full_name='Bruno Cardoso'),'Bruno Cardoso','Bruno','11987650021','O Serviço Cristão',NULL,'Temas da Ala','assigned_not_invited','bishopric','11987650021',false,NULL),
    (w,'2026-08-09',2,(SELECT id FROM members WHERE ward_id=w AND full_name='Patrícia Lopes'),'Patrícia Lopes','Patrícia','11987650020','A Caridade, o Puro Amor de Cristo',NULL,'Temas da Ala','gave_up','bishopric','11987650020',false,NULL),
    (w,'2026-08-09',3,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'not_assigned',NULL,NULL,false,NULL),

    -- 2026-09-06 (futuro, REGULAR, com delegação da família Lima)
    (w,'2026-09-06',1,(SELECT id FROM members WHERE ward_id=w AND full_name='João Vasconcelos'),'João Vasconcelos','João','11987650011','A Expiação de Jesus Cristo',NULL,'Conferência Geral — Abril 2026','assigned_confirmed','bishopric','11987650011',false,NULL),
    (w,'2026-09-06',2,(SELECT id FROM members WHERE ward_id=w AND full_name='Sofia Lima'),'Sofia Lima','Sofia',NULL,'A Conversão ao Senhor',NULL,'Temas da Ala','assigned_not_invited','bishopric','11987650026',true,'Sofia Lima'),
    (w,'2026-09-06',3,(SELECT id FROM members WHERE ward_id=w AND full_name='Lucas Martins'),'Lucas Martins','Lucas','11987650015','O Dom do Espírito Santo',NULL,'Temas da Ala','assigned_invited','bishopric','11987650015',false,NULL)
  ON CONFLICT (ward_id, sunday_date, position) DO NOTHING;

  -- ==========================================================================
  -- SUNDAY AGENDAS (welcome/hinos/designações) para os domingos planejados
  -- ==========================================================================
  INSERT INTO sunday_agendas (ward_id, sunday_date,
      presiding_name, conducting_name, pianist_name, conductor_name,
      recognized_names, announcements, welcome_new_families,
      opening_hymn_id, sacrament_hymn_id, intermediate_hymn_id, closing_hymn_id,
      has_intermediate_hymn, has_second_speech,
      has_baby_blessing, baby_blessing_names,
      has_baptism_confirmation, baptism_confirmation_names,
      has_stake_announcements, has_special_presentation, special_presentation_description) VALUES

    (w,'2026-07-05',
      'Ricardo Almeida','Paulo Mendes','Juliana Costa','Camila Dias',
      'Presidente Carvalho (Presidência de Estaca)','Atividade da Sociedade de Socorro na quarta, 19h30.','Família Andrade (recém-chegada de Curitiba)',
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=2),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=169),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=100),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=35),
      true, true, true,'Bênção do bebê: Miguel Andrade', false,NULL, false,false,NULL),

    (w,'2026-07-12',
      'Paulo Mendes','André Souza','Fernanda Rocha','Fernanda Rocha',
      NULL,'Noite familiar em conjunto no sábado, 18h.',NULL,
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=21),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=174),
      NULL,
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=46),
      false, false, false,NULL, true,'Confirmação: Irmã Helena Prado', false,false,NULL),

    (w,'2026-07-19',
      'Ricardo Almeida','Paulo Mendes','Juliana Costa','Camila Dias',
      NULL,'Reunião de jejum e testemunhos.',NULL,
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=26),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=181),
      NULL,
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=52),
      false, false, false,NULL, false,NULL, false,false,NULL),

    (w,'2026-07-26',
      'André Souza','Marcos Oliveira','Tiago Barros','Camila Dias',
      'Élder Carvalho (missionário de área)','Entrevistas do bispo após a reunião.','Família Nogueira',
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=72),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=170),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=128),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=85),
      true, true, false,NULL, false,NULL, false,false,NULL),

    (w,'2026-08-02',
      'Ricardo Almeida','Paulo Mendes','Juliana Costa','Fernanda Rocha',
      NULL,'Conselho de ala na terça, 20h.',NULL,
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=2),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=176),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=100),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=140),
      true, true, false,NULL, false,NULL, false,false,NULL),

    (w,'2026-09-06',
      'Bispo Nogueira','André Souza','Tiago Barros','Camila Dias',
      NULL,'Apresentação da Primária no próximo domingo.',NULL,
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=21),
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=185),
      NULL,
      (SELECT id FROM hymns WHERE language='pt-BR' AND number=66),
      false, true, false,NULL, false,NULL, false, true,'Número musical especial pelo coro da ala')
  ON CONFLICT (ward_id, sunday_date) DO NOTHING;

  RAISE NOTICE 'Seed concluído para ward %', w;
END $$;

-- Conferência rápida (rode separado se quiser):
-- SELECT count(*) AS membros FROM members;
-- SELECT sunday_date, count(*) FROM speeches GROUP BY 1 ORDER BY 1;
-- SELECT full_name, responsible_id FROM members WHERE contact_via_responsible;
