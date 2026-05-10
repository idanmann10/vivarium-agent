import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { storageTables } from "./schema.js";

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  json: text("json").notNull(),
});

export const episodes = sqliteTable("episodes", {
  sequence: integer("sequence").primaryKey({ autoIncrement: true }),
  id: text("id").notNull().unique(),
  runId: text("run_id").notNull(),
  json: text("json").notNull(),
});

export const confidenceBuckets = sqliteTable("confidence_buckets", {
  bucket: text("bucket").primaryKey(),
  correct: integer("correct").notNull(),
  total: integer("total").notNull(),
});

export const curriculumProgress = sqliteTable("curriculum_progress", {
  domain: text("domain").primaryKey(),
  json: text("json").notNull(),
});

export const localSkills = sqliteTable("local_skills", {
  id: text("id").primaryKey(),
  json: text("json").notNull(),
});

export const identity = sqliteTable("identity", {
  id: text("id").primaryKey(),
  json: text("json").notNull(),
});

export const publishableArtifacts = sqliteTable("publishable_artifacts", {
  sequence: integer("sequence").primaryKey({ autoIncrement: true }),
  json: text("json").notNull(),
});

export const semanticFacts = sqliteTable("semantic_facts", {
  id: text("id").primaryKey(),
  domain: text("domain").notNull(),
  json: text("json").notNull(),
});

export const dreamCandidates = sqliteTable("dream_candidates", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  domain: text("domain").notNull(),
  json: text("json").notNull(),
});

export const toolUsage = sqliteTable(
  "tool_usage",
  {
    toolName: text("tool_name").notNull(),
    day: text("day").notNull(),
    count: integer("count").notNull(),
  },
  (table) => [primaryKey({ columns: [table.toolName, table.day] })],
);

export const stateDrizzleTables = {
  runs,
  episodes,
  confidence_buckets: confidenceBuckets,
  curriculum_progress: curriculumProgress,
  local_skills: localSkills,
  identity,
  publishable_artifacts: publishableArtifacts,
  semantic_facts: semanticFacts,
  dream_candidates: dreamCandidates,
  tool_usage: toolUsage,
} as const;

export const stateDrizzleTableNames = storageTables;
