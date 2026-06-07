-- Vector similarity search RPC for memory retrieval
CREATE OR REPLACE FUNCTION match_memory_nodes(
  query_embedding vector(768),
  match_family_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  label TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mn.id,
    mn.type,
    mn.label,
    mn.content,
    1 - (mn.embedding <=> query_embedding) AS similarity
  FROM memory_nodes mn
  WHERE mn.family_id = match_family_id
    AND mn.embedding IS NOT NULL
  ORDER BY mn.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS google_event_id TEXT UNIQUE;
