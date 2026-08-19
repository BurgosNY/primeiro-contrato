import snapshotJson from "@/data/itapoa-opportunities.public.json";
import type { MatchApiResponse, OpportunityRequirement, OpportunitySnapshot, PersistedState, ProviderProfile, PublicOpportunity } from "./domain";
import { matchOpportunities } from "./matching";
import { defaultProfile } from "./profile";

const fixture = snapshotJson as unknown as OpportunitySnapshot;
const enc = new TextEncoder();
export async function contentHash(value: unknown) {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function ensureSeed(db: D1Database) {
  const row = await db.prepare("SELECT COUNT(*) AS count FROM opportunities").first<{ count: number }>();
  if ((row?.count ?? 0) > 0) return;
  const now = fixture.snapshot.capturedAt;
  const statements = [];
  for (const opportunity of fixture.opportunities) {
    statements.push(db.prepare("INSERT INTO opportunities (id, source, source_url, status, payload_json, content_hash, captured_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(opportunity.opportunityId, "Contrata+Brasil", opportunity.sourceUrl, "open", JSON.stringify(opportunity), await contentHash(opportunity), now, now));
  }
  statements.push(db.prepare("INSERT INTO refresh_runs (id, status, source, opportunity_count, requirements_count, model, message, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(`seed-${now}`, "seeded", "committed_snapshot", fixture.opportunities.length, 0, null, "Snapshot auditável inicial; use Atualizar oportunidades para coletar e analisar ao vivo.", now, now));
  await db.batch(statements);
}

export async function getOrCreateProfile(db: D1Database, sessionId: string): Promise<ProviderProfile> {
  const existing = await db.prepare("SELECT payload_json FROM profiles WHERE session_id = ?").bind(sessionId).first<{ payload_json: string }>();
  if (existing) return JSON.parse(existing.payload_json) as ProviderProfile;
  const now = new Date().toISOString();
  const profile = { ...defaultProfile, id: crypto.randomUUID(), updatedAt: now };
  await db.prepare("INSERT INTO profiles (id, session_id, payload_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
    .bind(profile.id, sessionId, JSON.stringify(profile), now, now).run();
  return profile;
}

export async function saveProfile(db: D1Database, sessionId: string, profile: ProviderProfile) {
  const current = await getOrCreateProfile(db, sessionId);
  const saved: ProviderProfile = { ...profile, id: current.id, schemaVersion: "1.0", demoProfile: true, updatedAt: new Date().toISOString() };
  await db.prepare("UPDATE profiles SET payload_json = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(saved), saved.updatedAt, current.id).run();
  return saved;
}

export async function loadOpportunities(db: D1Database) {
  const result = await db.prepare("SELECT payload_json FROM opportunities WHERE status = 'open' ORDER BY id").all<{ payload_json: string }>();
  return result.results.map((row) => JSON.parse(row.payload_json) as PublicOpportunity);
}

export async function loadRequirements(db: D1Database) {
  const result = await db.prepare("SELECT payload_json FROM opportunity_requirements").all<{ payload_json: string }>();
  return result.results.map((row) => JSON.parse(row.payload_json) as OpportunityRequirement);
}

export async function persistMatches(db: D1Database, profile: ProviderProfile, response: MatchApiResponse) {
  const now = response.generatedAt;
  const statements = [db.prepare("DELETE FROM matches WHERE profile_id = ?").bind(profile.id)];
  for (const match of response.matches) statements.push(db.prepare("INSERT INTO matches (profile_id, opportunity_id, score, band, blocked, payload_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(profile.id, match.opportunityId, match.score, match.band, match.blocked ? 1 : 0, JSON.stringify(match), now));
  await db.batch(statements);
}

export async function recomputeMatches(db: D1Database, profile: ProviderProfile) {
  const response = matchOpportunities(profile, await loadOpportunities(db), await loadRequirements(db));
  await persistMatches(db, profile, response);
  return response;
}

export async function buildState(db: D1Database, sessionId: string): Promise<PersistedState> {
  await ensureSeed(db);
  const profile = await getOrCreateProfile(db, sessionId);
  const opportunities = await loadOpportunities(db);
  const requirements = await loadRequirements(db);
  const matches = matchOpportunities(profile, opportunities, requirements);
  await persistMatches(db, profile, matches);
  const latest = await db.prepare("SELECT status, source, opportunity_count, requirements_count, model, message, COALESCE(completed_at, started_at) AS captured_at FROM refresh_runs ORDER BY started_at DESC LIMIT 1")
    .first<{ status: PersistedState["lastRefresh"]["status"]; source: PersistedState["lastRefresh"]["source"]; opportunity_count: number; requirements_count: number; model: string | null; message: string | null; captured_at: string }>();
  const capturedAt = latest?.captured_at ?? fixture.snapshot.capturedAt;
  return {
    profile, matches,
    snapshot: { ...fixture, snapshot: { ...fixture.snapshot, capturedAt, coverage: { ...fixture.snapshot.coverage, declaredOpportunityCount: opportunities.length, uniqueIds: opportunities.length, detailsProcessed: opportunities.length }, binaryQa: fixture.snapshot.binaryQa }, opportunities },
    lastRefresh: { status: latest?.status ?? "seeded", source: latest?.source ?? "committed_snapshot", capturedAt, opportunityCount: latest?.opportunity_count ?? opportunities.length, requirementsCount: latest?.requirements_count ?? requirements.length, model: latest?.model ?? null, ...(latest?.message ? { message: latest.message } : {}) },
  };
}

export async function upsertLiveData(db: D1Database, opportunities: PublicOpportunity[], requirements: OpportunityRequirement[], runId: string, startedAt: string, model: string) {
  const now = new Date().toISOString();
  const statements = [db.prepare("UPDATE opportunities SET status = 'closed' WHERE status = 'open'")];
  for (const item of opportunities) statements.push(db.prepare("INSERT INTO opportunities (id, source, source_url, status, payload_json, content_hash, captured_at, last_seen_at) VALUES (?, ?, ?, 'open', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET source_url=excluded.source_url,status='open',payload_json=excluded.payload_json,content_hash=excluded.content_hash,captured_at=excluded.captured_at,last_seen_at=excluded.last_seen_at")
    .bind(item.opportunityId, "Contrata+Brasil", item.sourceUrl, JSON.stringify(item), await contentHash(item), item.capturedAt, now));
  for (const req of requirements) statements.push(db.prepare("INSERT INTO opportunity_requirements (opportunity_id, content_hash, model, schema_version, payload_json, extracted_at) VALUES (?, ?, ?, '1.0', ?, ?) ON CONFLICT(opportunity_id) DO UPDATE SET content_hash=excluded.content_hash,model=excluded.model,schema_version=excluded.schema_version,payload_json=excluded.payload_json,extracted_at=excluded.extracted_at")
    .bind(req.opportunityId, req.contentHash, req.model, JSON.stringify(req), req.extractedAt));
  statements.push(db.prepare("UPDATE refresh_runs SET status='succeeded', opportunity_count=?, requirements_count=?, model=?, message=?, completed_at=? WHERE id=?")
    .bind(opportunities.length, requirements.length, model, `Coleta ao vivo concluída: ${opportunities.length} oportunidades e ${requirements.length} requisitos analisados.`, now, runId));
  await db.batch(statements);
}

export async function beginRefresh(db: D1Database) {
  const latest = await db.prepare("SELECT status, COALESCE(completed_at, started_at) AS at FROM refresh_runs ORDER BY started_at DESC LIMIT 1").first<{ status: string; at: string }>();
  const age = latest ? Date.now() - new Date(latest.at).getTime() : Infinity;
  if (latest?.status === "running" && age < 120_000) return { allowed: false, reason: "Já existe uma atualização em andamento." } as const;
  if (latest?.status === "succeeded" && age < 300_000) return { allowed: false, reason: "As oportunidades já foram atualizadas há menos de cinco minutos." } as const;
  const id = crypto.randomUUID(); const startedAt = new Date().toISOString();
  await db.prepare("INSERT INTO refresh_runs (id,status,source,opportunity_count,requirements_count,started_at) VALUES (?,'running','live_contrata_brasil',0,0,?)").bind(id, startedAt).run();
  return { allowed: true, id, startedAt } as const;
}

export async function failRefresh(db: D1Database, id: string, message: string) {
  await db.prepare("UPDATE refresh_runs SET status='failed', message=?, completed_at=? WHERE id=?").bind(message.slice(0, 500), new Date().toISOString(), id).run();
}
