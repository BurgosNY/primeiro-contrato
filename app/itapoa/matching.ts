import type { MatchApiResponse, MatchResult, OpportunityRequirement, ProviderProfile, PublicOpportunity, SkillLevel } from "./domain";
import { capabilityCatalog, skillCatalog } from "./profile";

const levelFactors: Record<SkillLevel, number> = { basic: 0.6, experienced: 0.85, specialist: 1 };
const blockingQualityCodes = new Set(["execution_before_proposal_close"]);
const round = Math.round;

export function matchOpportunity(profile: ProviderProfile, opportunity: PublicOpportunity, requirement?: OpportunityRequirement): MatchResult {
  const skills = requirement?.skills ?? [];
  const capabilities = requirement?.capabilities ?? [];
  const profileSkills = new Map(profile.skills.map((skill) => [skill.id, skill]));
  const cityMatches = opportunity.executionLocation.city?.toLocaleLowerCase("pt-BR") === profile.baseLocation.city.toLocaleLowerCase("pt-BR")
    && opportunity.executionLocation.state === profile.baseLocation.state;
  const legalMatches = !opportunity.onlyMei || (profile.legal.type === "MEI" && profile.legal.status === "active");
  const weights = skills.map((skill) => skill.importance === "required" ? 1 : 0.45);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const technicalCoverage = skills.reduce((sum, required, index) => {
    const declared = profileSkills.get(required.id);
    return sum + weights[index] * (declared ? levelFactors[declared.level] : 0);
  }, 0) / totalWeight;
  const requiredCapabilities = capabilities.filter((item) => item.required);
  const capabilityCoverage = requiredCapabilities.length
    ? requiredCapabilities.filter(({ id }) => profile.capabilities.includes(id)).length / requiredCapabilities.length : 1;
  const evidenceCoverage = skills.length ? skills.filter(({ id }) => profileSkills.has(id)).length / skills.length : 0;
  const breakdown = {
    legalAndLocation: round((legalMatches ? 10 : 0) + (cityMatches ? 15 : 0)),
    technical: round(technicalCoverage * 55), operational: round(capabilityCoverage * 15), evidence: round(evidenceCoverage * 5),
  };
  const score = Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0));
  const reasons = skills.filter(({ id }) => profileSkills.has(id)).map(({ id }) => `Experiência declarada em ${skillCatalog[id].shortLabel.toLocaleLowerCase("pt-BR")}`);
  if (cityMatches) reasons.push(`Atendimento local em ${profile.baseLocation.city}`);
  if (legalMatches && opportunity.onlyMei) reasons.push("Enquadramento MEI compatível");
  const supportedCapabilities = requiredCapabilities.filter(({ id }) => profile.capabilities.includes(id));
  if (supportedCapabilities.length) reasons.push(`${supportedCapabilities.length}/${requiredCapabilities.length} capacidades operacionais atendidas`);
  const gaps = skills.filter(({ id }) => !profileSkills.has(id)).map(({ id }) => `Falta declarar ${skillCatalog[id].shortLabel.toLocaleLowerCase("pt-BR")}`);
  gaps.push(...requiredCapabilities.filter(({ id }) => !profile.capabilities.includes(id)).map(({ id }) => `Falta confirmar: ${capabilityCatalog[id].toLocaleLowerCase("pt-BR")}`));
  if (!requirement) gaps.push("Requisitos semânticos ainda não extraídos pela IA");
  const blockers: string[] = [];
  if (!legalMatches) blockers.push("O enquadramento jurídico não atende à oportunidade");
  if (!cityMatches) blockers.push("O local está fora da área de atendimento declarada");
  for (const flag of opportunity.qualityFlags) if (flag.severity === "critical" && blockingQualityCodes.has(flag.code)) blockers.push(flag.evidence);
  const blocked = blockers.length > 0;
  const band = requirement && !blocked && score >= 75 && technicalCoverage >= 0.75 ? "recommended" : score >= 55 ? "review" : "not_fit";
  return { opportunityId: opportunity.opportunityId, score, band, eligible: legalMatches && cityMatches, blocked, breakdown, reasons, gaps, blockers,
    requiredSkills: skills.map(({ id }) => id), requiredCapabilities: requiredCapabilities.map(({ id }) => id) };
}

export function matchOpportunities(profile: ProviderProfile, opportunities: PublicOpportunity[], requirements: OpportunityRequirement[] = []): MatchApiResponse {
  const byId = new Map(requirements.map((item) => [item.opportunityId, item]));
  return { profile, matches: opportunities.map((item) => matchOpportunity(profile, item, byId.get(item.opportunityId)))
    .sort((a, b) => b.score - a.score || a.opportunityId.localeCompare(b.opportunityId)), generatedAt: new Date().toISOString(), scoringVersion: "itapoa-v2-ai-requirements" };
}
