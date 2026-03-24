ALTER TABLE chapters
  ADD COLUMN content             TEXT,
  ADD COLUMN content_fetched_at  TIMESTAMPTZ;
