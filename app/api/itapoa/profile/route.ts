import { getD1 } from "@/db";
import { assertSameOrigin, sessionFromRequest } from "@/app/itapoa/session";
import { buildState, saveProfile } from "@/app/itapoa/store";
import type { ProviderProfile } from "@/app/itapoa/domain";
import { capabilityCatalog, skillCatalog } from "@/app/itapoa/profile";

function validate(input: unknown): ProviderProfile {
  const profile = input as ProviderProfile;
  if (!profile || typeof profile.displayName !== "string" || !profile.displayName.trim() || typeof profile.ownerName !== "string" || !profile.ownerName.trim()) throw new Error("Nome da empresa e responsável são obrigatórios.");
  if (!Number.isInteger(profile.teamSize) || profile.teamSize < 1 || profile.teamSize > 100) throw new Error("A equipe deve ter entre 1 e 100 pessoas.");
  if (!profile.baseLocation || !profile.baseLocation.city || profile.baseLocation.state.length !== 2 || profile.baseLocation.serviceRadiusKm < 1 || profile.baseLocation.serviceRadiusKm > 500) throw new Error("Área de atendimento inválida.");
  if (!Array.isArray(profile.skills) || profile.skills.some((skill) => !(skill.id in skillCatalog) || !["basic","experienced","specialist"].includes(skill.level))) throw new Error("Competências inválidas.");
  if (!Array.isArray(profile.capabilities) || profile.capabilities.some((id) => !(id in capabilityCatalog))) throw new Error("Capacidades inválidas.");
  return profile;
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request); const session = sessionFromRequest(request); const body = await request.json() as { profile: unknown };
    await saveProfile(getD1(), session.sessionId, validate(body.profile)); const state = await buildState(getD1(), session.sessionId);
    const headers = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" }); if (session.setCookie) headers.set("Set-Cookie", session.setCookie);
    return new Response(JSON.stringify(state), { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Falha ao salvar o perfil." }, { status: 400 }); }
}
