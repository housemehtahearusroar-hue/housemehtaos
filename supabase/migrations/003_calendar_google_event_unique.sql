-- 002 used ADD COLUMN IF NOT EXISTS, which skips the UNIQUE when the column
-- already existed from 001_initial.sql. This index enables upsert on sync.
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_google_event_id_unique
  ON calendar_events (google_event_id)
  WHERE google_event_id IS NOT NULL;
