import snapshotJson from "@/data/itapoa-opportunities.public.json";
import type { OpportunitySnapshot, ProviderProfile } from "@/app/itapoa/domain";
import { matchOpportunities } from "@/app/itapoa/matching";

const snapshot = snapshotJson as unknown as OpportunitySnapshot;

const skillIds = new Set([
  "gutters_roofing", "masonry", "concrete_structures", "basic_plumbing", "drywall",
  "electrical", "metalwork", "signage", "outdoor_structures", "locksmith",
  "gate_automation", "sanitation_systems",
]);
const skillLevels = new Set(["basic", "experienced", "specialist"]);
const capabilityIds = new Set([
  "technical_visit", "materials_supply", "local_transport", "site_cleanup", "waste_disposal",
]);

function isProviderProfile(value: unknown): value is ProviderProfile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProviderProfile>;
  return candidate.schemaVersion === "1.0"
    && typeof candidate.id === "string"
    && typeof candidate.displayName === "string"
    && Array.isArray(candidate.skills)
    && candidate.skills.length <= skillIds.size
    && candidate.skills.every((skill) => skillIds.has(skill.id) && skillLevels.has(skill.level) && skill.evidence === "self_declared")
    && Array.isArray(candidate.capabilities)
    && candidate.capabilities.length <= capabilityIds.size
    && candidate.capabilities.every((capability) => capabilityIds.has(capability))
    && candidate.legal?.type === "MEI"
    && candidate.legal.status === "active"
    && typeof candidate.baseLocation?.city === "string"
    && candidate.baseLocation.state === "SC"
    && Number.isFinite(candidate.baseLocation.serviceRadiusKm)
    && candidate.baseLocation.serviceRadiusKm >= 0
    && candidate.baseLocation.serviceRadiusKm <= 200
    && Number.isInteger(candidate.teamSize)
    && candidate.teamSize >= 1
    && candidate.teamSize <= 10;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const profile = (body as { profile?: unknown })?.profile;
  if (!isProviderProfile(profile)) {
    return Response.json({ error: "Perfil inválido" }, { status: 422 });
  }

  return Response.json(matchOpportunities(profile, snapshot.opportunities), {
    headers: { "Cache-Control": "no-store" },
  });
}
