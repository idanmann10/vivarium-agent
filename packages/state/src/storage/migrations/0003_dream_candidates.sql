CREATE TABLE IF NOT EXISTS dream_candidates (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  domain TEXT NOT NULL,
  json TEXT NOT NULL
);
