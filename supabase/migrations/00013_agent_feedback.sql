-- Agent feedback: per-exchange thumbs up/down with full trace for post-hoc inspection
CREATE TABLE IF NOT EXISTS agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  trace JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_feedback_user_id_created_at_idx
  ON agent_feedback (user_id, created_at DESC);

ALTER TABLE agent_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_feedback_select_own"
  ON agent_feedback FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "agent_feedback_insert_own"
  ON agent_feedback FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);
