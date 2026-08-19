import { env } from "cloudflare:workers";
import { getD1 } from "@/db";
import { extractRequirements, requirementHash, REQUIREMENTS_MODEL } from "@/app/itapoa/ai";
import { collectLiveOpportunities } from "@/app/itapoa/contrata";
import { assertSameOrigin, sessionFromRequest } from "@/app/itapoa/session";
import { beginRefresh, buildState, failRefresh, loadRequirements, upsertLiveData } from "@/app/itapoa/store";

export async function POST(request: Request) {
  const db = getD1(); let runId: string | null = null;
  try {
    assertSameOrigin(request); const session = sessionFromRequest(request); const gate = await beginRefresh(db);
    if (!gate.allowed) return Response.json({ error: gate.reason, state: await buildState(db, session.sessionId) }, { status: 429 });
    runId = gate.id; const collected = await collectLiveOpportunities();
    const existing = new Map((await loadRequirements(db)).map((item) => [item.opportunityId, item]));
    const changed = [];
    for (const opportunity of collected.opportunities) if (existing.get(opportunity.opportunityId)?.contentHash !== await requirementHash(opportunity)) changed.push(opportunity);
    const apiKey = (env as unknown as { OPENAI_API_KEY?: string }).OPENAI_API_KEY ?? "";
    const extracted = changed.length ? await extractRequirements(changed, apiKey) : [];
    const changedIds = new Set(changed.map((item) => item.opportunityId));
    const requirements = [...collected.opportunities.filter((item) => !changedIds.has(item.opportunityId)).map((item) => existing.get(item.opportunityId)).filter((item): item is NonNullable<typeof item> => Boolean(item)), ...extracted];
    await upsertLiveData(db, collected.opportunities, requirements, gate.id, gate.startedAt, REQUIREMENTS_MODEL);
    const state = await buildState(db, session.sessionId); const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" }); if (session.setCookie) headers.set("Set-Cookie", session.setCookie);
    return new Response(JSON.stringify(state), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao atualizar oportunidades."; if (runId) await failRefresh(db, runId, message);
    return Response.json({ error: message }, { status: 502 });
  }
}
