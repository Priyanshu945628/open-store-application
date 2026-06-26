-- Open Store — Supabase table setup
-- Run this in Supabase SQL Editor after creating your project.

-- Records table (DB data + small media files < 5MB as base64)
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  "table" TEXT NOT NULL,
  data JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_records_table ON records("table");
CREATE INDEX IF NOT EXISTS idx_records_table_id ON records("table", id);

-- Row Level Security (allow all with service role key)
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON records FOR ALL USING (true) WITH CHECK (true);

-- How it works:
--   DB records → table column = "users", "posts", "messages", etc.
--   Small media → table column = "_media", data contains base64
--   Large media (videos/shorts) → stored in Telegram, not here
