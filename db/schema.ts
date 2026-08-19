import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("profiles_session_idx").on(table.sessionId)]);

export const opportunities = sqliteTable("opportunities", {
  id: text("id").primaryKey(), source: text("source").notNull(), sourceUrl: text("source_url").notNull(),
  status: text("status").notNull(), payloadJson: text("payload_json").notNull(), contentHash: text("content_hash").notNull(),
  capturedAt: text("captured_at").notNull(), lastSeenAt: text("last_seen_at").notNull(),
}, (table) => [index("opportunities_status_idx").on(table.status)]);

export const opportunityRequirements = sqliteTable("opportunity_requirements", {
  opportunityId: text("opportunity_id").primaryKey().references(() => opportunities.id, { onDelete: "cascade" }),
  contentHash: text("content_hash").notNull(), model: text("model").notNull(), schemaVersion: text("schema_version").notNull(),
  payloadJson: text("payload_json").notNull(), extractedAt: text("extracted_at").notNull(),
});

export const matches = sqliteTable("matches", {
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  opportunityId: text("opportunity_id").notNull().references(() => opportunities.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), band: text("band").notNull(), blocked: integer("blocked", { mode: "boolean" }).notNull(),
  payloadJson: text("payload_json").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.profileId, table.opportunityId] }), index("matches_profile_score_idx").on(table.profileId, table.score)]);

export const refreshRuns = sqliteTable("refresh_runs", {
  id: text("id").primaryKey(), status: text("status").notNull(), source: text("source").notNull(),
  opportunityCount: integer("opportunity_count").notNull().default(0), requirementsCount: integer("requirements_count").notNull().default(0),
  model: text("model"), message: text("message"), startedAt: text("started_at").notNull(), completedAt: text("completed_at"),
}, (table) => [index("refresh_runs_started_idx").on(table.startedAt)]);
