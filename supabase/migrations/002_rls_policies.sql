-- 002_rls_policies.sql
-- Row-Level Security policies for all tables

-- =============================================================================
-- HELPER: Extract ward_id from JWT app_metadata
-- =============================================================================
CREATE OR REPLACE FUNCTION auth.ward_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'ward_id')::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID
  );
$$ LANGUAGE SQL STABLE;

-- =============================================================================
-- WARDS - Ward-scoped: users can only access their own ward
-- =============================================================================
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ward"
  ON wards FOR SELECT
  TO authenticated
  USING (id = auth.ward_id());

CREATE POLICY "Users can update their own ward"
  ON wards FOR UPDATE
  TO authenticated
  USING (id = auth.ward_id())
  WITH CHECK (id = auth.ward_id());

-- =============================================================================
-- MEMBERS - Ward-scoped
-- =============================================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ward members"
  ON members FOR SELECT
  TO authenticated
  USING (ward_id = auth.ward_id());

CREATE POLICY "Users can insert ward members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can update ward members"
  ON members FOR UPDATE
  TO authenticated
  USING (ward_id = auth.ward_id())
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can delete ward members"
  ON members FOR DELETE
  TO authenticated
  USING (ward_id = auth.ward_id());

-- =============================================================================
-- WARD TOPICS - Ward-scoped
-- =============================================================================
ALTER TABLE ward_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ward topics"
  ON ward_topics FOR SELECT
  TO authenticated
  USING (ward_id = auth.ward_id());

CREATE POLICY "Users can insert ward topics"
  ON ward_topics FOR INSERT
  TO authenticated
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can update ward topics"
  ON ward_topics FOR UPDATE
  TO authenticated
  USING (ward_id = auth.ward_id())
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can delete ward topics"
  ON ward_topics FOR DELETE
  TO authenticated
  USING (ward_id = auth.ward_id());

-- =============================================================================
-- GENERAL COLLECTIONS - Global: SELECT only for authenticated users
-- =============================================================================
ALTER TABLE general_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view general collections"
  ON general_collections FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- GENERAL TOPICS - Global: SELECT only for authenticated users
-- =============================================================================
ALTER TABLE general_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view general topics"
  ON general_topics FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- WARD COLLECTION CONFIG - Ward-scoped
-- =============================================================================
ALTER TABLE ward_collection_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ward collection config"
  ON ward_collection_config FOR SELECT
  TO authenticated
  USING (ward_id = auth.ward_id());

CREATE POLICY "Users can insert ward collection config"
  ON ward_collection_config FOR INSERT
  TO authenticated
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can update ward collection config"
  ON ward_collection_config FOR UPDATE
  TO authenticated
  USING (ward_id = auth.ward_id())
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can delete ward collection config"
  ON ward_collection_config FOR DELETE
  TO authenticated
  USING (ward_id = auth.ward_id());

-- =============================================================================
-- SUNDAY EXCEPTIONS - Ward-scoped
-- =============================================================================
ALTER TABLE sunday_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sunday exceptions"
  ON sunday_exceptions FOR SELECT
  TO authenticated
  USING (ward_id = auth.ward_id());

CREATE POLICY "Users can insert sunday exceptions"
  ON sunday_exceptions FOR INSERT
  TO authenticated
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can update sunday exceptions"
  ON sunday_exceptions FOR UPDATE
  TO authenticated
  USING (ward_id = auth.ward_id())
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can delete sunday exceptions"
  ON sunday_exceptions FOR DELETE
  TO authenticated
  USING (ward_id = auth.ward_id());

-- =============================================================================
-- SPEECHES - Ward-scoped
-- =============================================================================
ALTER TABLE speeches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ward speeches"
  ON speeches FOR SELECT
  TO authenticated
  USING (ward_id = auth.ward_id());

CREATE POLICY "Users can insert ward speeches"
  ON speeches FOR INSERT
  TO authenticated
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can update ward speeches"
  ON speeches FOR UPDATE
  TO authenticated
  USING (ward_id = auth.ward_id())
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can delete ward speeches"
  ON speeches FOR DELETE
  TO authenticated
  USING (ward_id = auth.ward_id());

-- =============================================================================
-- MEETING ACTORS - Ward-scoped
-- =============================================================================
ALTER TABLE meeting_actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ward actors"
  ON meeting_actors FOR SELECT
  TO authenticated
  USING (ward_id = auth.ward_id());

CREATE POLICY "Users can insert ward actors"
  ON meeting_actors FOR INSERT
  TO authenticated
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can update ward actors"
  ON meeting_actors FOR UPDATE
  TO authenticated
  USING (ward_id = auth.ward_id())
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can delete ward actors"
  ON meeting_actors FOR DELETE
  TO authenticated
  USING (ward_id = auth.ward_id());

-- =============================================================================
-- HYMNS - Global: SELECT only for authenticated users
-- =============================================================================
ALTER TABLE hymns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hymns"
  ON hymns FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- SUNDAY AGENDAS - Ward-scoped
-- =============================================================================
ALTER TABLE sunday_agendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ward agendas"
  ON sunday_agendas FOR SELECT
  TO authenticated
  USING (ward_id = auth.ward_id());

CREATE POLICY "Users can insert ward agendas"
  ON sunday_agendas FOR INSERT
  TO authenticated
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can update ward agendas"
  ON sunday_agendas FOR UPDATE
  TO authenticated
  USING (ward_id = auth.ward_id())
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can delete ward agendas"
  ON sunday_agendas FOR DELETE
  TO authenticated
  USING (ward_id = auth.ward_id());

-- =============================================================================
-- ACTIVITY LOG - Ward-scoped: SELECT + INSERT only (no UPDATE, no DELETE)
-- =============================================================================
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ward activity log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (ward_id = auth.ward_id());

CREATE POLICY "Users can insert ward activity log"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (ward_id = auth.ward_id());

-- =============================================================================
-- INVITATIONS - Ward-scoped
-- =============================================================================
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ward invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (ward_id = auth.ward_id());

CREATE POLICY "Users can insert ward invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (ward_id = auth.ward_id());

CREATE POLICY "Users can update ward invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (ward_id = auth.ward_id())
  WITH CHECK (ward_id = auth.ward_id());

-- =============================================================================
-- DEVICE PUSH TOKENS - User-scoped (user_id = auth.uid())
-- =============================================================================
ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push tokens"
  ON device_push_tokens FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own push tokens"
  ON device_push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push tokens"
  ON device_push_tokens FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own push tokens"
  ON device_push_tokens FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- NOTIFICATION QUEUE - No direct client access (managed by DB triggers and Edge Functions)
-- =============================================================================
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- No policies = no client access. Only service_role key (Edge Functions) can access.
