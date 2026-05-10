CREATE TABLE IF NOT EXISTS tool_usage (
  tool_name TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (tool_name, day)
);
