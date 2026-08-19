import type {
  CapabilityId,
  MatchApiResponse,
  MatchResult,
  ProviderProfile,
  PublicOpportunity,
  SkillId,
  SkillLevel,
} from "./domain";
import { capabilityCatalog, skillCatalog } from "./profile";

type Requirement = {
  skills: Array<{ id: SkillId; weight: number }>;
  capabilities: CapabilityId[];
};

const requirementsByOpportunity: Record<string, Requirement> = {
  "12500": { skills: [{ id: "signage", weight: 1 }], capabilities: ["materials_supply", "local_transport"] },
  "12644": { skills: [{ id: "concrete_structures", weight: 0.75 }, { id: "masonry", weight: 0.25 }], capabilities: ["technical_visit", "materials_supply", "local_transport", "site_cleanup", "waste_disposal"] },
  "12648": { skills: [{ id: "sanitation_systems", weight: 0.75 }, { id: "basic_plumbing", weight: 0.25 }], capabilities: ["technical_visit", "materials_supply", "local_transport"] },
  "12670": { skills: [{ id: "electrical", weight: 1 }], capabilities: ["technical_visit", "materials_supply", "local_transport"] },
  "12672": { skills: [{ id: "basic_plumbing", weight: 1 }], capabilities: ["technical_visit", "materials_supply", "local_transport", "site_cleanup"] },
  "12673": { skills: [{ id: "masonry", weight: 0.35 }, { id: "electrical", weight: 0.25 }, { id: "basic_plumbing", weight: 0.25 }, { id: "drywall", weight: 0.15 }], capabilities: ["technical_visit", "materials_supply", "local_transport", "site_cleanup", "waste_disposal"] },
  "12766": { skills: [{ id: "outdoor_structures", weight: 0.55 }, { id: "signage", weight: 0.45 }], capabilities: ["materials_supply", "local_transport"] },
  "12770": { skills: [{ id: "locksmith", weight: 1 }], capabilities: ["technical_visit", "materials_supply", "local_transport"] },
  "12800": { skills: [{ id: "gate_automation", weight: 0.7 }, { id: "metalwork", weight: 0.3 }], capabilities: ["materials_supply", "local_transport"] },
  "12888": { skills: [{ id: "metalwork", weight: 1 }], capabilities: ["materials_supply", "local_transport"] },
  "12889": { skills: [{ id: "metalwork", weight: 1 }], capabilities: ["materials_supply", "local_transport"] },
  "12908": { skills: [{ id: "gutters_roofing", weight: 0.85 }, { id: "masonry", weight: 0.15 }], capabilities: ["technical_visit", "materials_supply", "local_transport", "site_cleanup"] },
};

const levelFactors: Record<SkillLevel, number> = {
  basic: 0.6,
  experienced: 0.85,
  specialist: 1,
};

const blockingQualityCodes = new Set(["execution_before_proposal_close"]);

const round = (value: number) => Math.round(value);

export function matchOpportunity(profile: ProviderProfile, opportunity: PublicOpportunity): MatchResult {
  const requirement = requirementsByOpportunity[opportunity.opportunityId] ?? { skills: [], capabilities: [] };
  const profileSkills = new Map(profile.skills.map((skill) => [skill.id, skill]));
  const cityMatches = opportunity.executionLocation.city?.toLocaleLowerCase("pt-BR") === profile.baseLocation.city.toLocaleLowerCase("pt-BR")
    && opportunity.executionLocation.state === profile.baseLocation.state;
  const legalMatches = !opportunity.onlyMei || (profile.legal.type === "MEI" && profile.legal.status === "active");

  const technicalCoverage = requirement.skills.reduce((sum, required) => {
    const skill = profileSkills.get(required.id);
    return sum + required.weight * (skill ? levelFactors[skill.level] : 0);
  }, 0);
  const capabilityCoverage = requirement.capabilities.length
    ? requirement.capabilities.filter((id) => profile.capabilities.includes(id)).length / requirement.capabilities.length
    : 1;
  const matchedRequiredSkills = requirement.skills.filter(({ id }) => profileSkills.has(id));
  const evidenceCoverage = requirement.skills.length
    ? matchedRequiredSkills.reduce((sum, skill) => sum + skill.weight, 0) * 0.65
    : 0;

  const breakdown = {
    legalAndLocation: round((legalMatches ? 10 : 0) + (cityMatches ? 15 : 0)),
    technical: round(technicalCoverage * 55),
    operational: round(capabilityCoverage * 15),
    evidence: round(evidenceCoverage * 5),
  };
  const score = Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0));

  const reasons = requirement.skills
    .filter(({ id }) => profileSkills.has(id))
    .map(({ id }) => `Experiência declarada em ${skillCatalog[id].shortLabel.toLocaleLowerCase("pt-BR")}`);
  if (cityMatches) reasons.push(`Atendimento local em ${profile.baseLocation.city}`);
  if (legalMatches && opportunity.onlyMei) reasons.push("Enquadramento MEI compatível");
  const supportedCapabilities = requirement.capabilities.filter((id) => profile.capabilities.includes(id));
  if (supportedCapabilities.length) {
    reasons.push(`${supportedCapabilities.length}/${requirement.capabilities.length} capacidades operacionais atendidas`);
  }

  const gaps = requirement.skills
    .filter(({ id }) => !profileSkills.has(id))
    .map(({ id }) => `Falta declarar ${skillCatalog[id].shortLabel.toLocaleLowerCase("pt-BR")}`);
  gaps.push(...requirement.capabilities
    .filter((id) => !profile.capabilities.includes(id))
    .map((id) => `Falta confirmar: ${capabilityCatalog[id].toLocaleLowerCase("pt-BR")}`));

  const blockers: string[] = [];
  if (!legalMatches) blockers.push("O enquadramento jurídico não atende à oportunidade");
  if (!cityMatches) blockers.push("O local está fora da área de atendimento declarada");
  for (const flag of opportunity.qualityFlags) {
    if (flag.severity === "critical" && blockingQualityCodes.has(flag.code)) blockers.push(flag.evidence);
  }

  const eligible = legalMatches && cityMatches;
  const blocked = blockers.length > 0;
  const band = !blocked && score >= 75 && technicalCoverage >= 0.75
    ? "recommended"
    : score >= 55
      ? "review"
      : "not_fit";

  return {
    opportunityId: opportunity.opportunityId,
    score,
    band,
    eligible,
    blocked,
    breakdown,
    reasons,
    gaps,
    blockers,
    requiredSkills: requirement.skills.map(({ id }) => id),
    requiredCapabilities: requirement.capabilities,
  };
}

export function matchOpportunities(profile: ProviderProfile, opportunities: PublicOpportunity[]): MatchApiResponse {
  return {
    profile,
    matches: opportunities
      .map((opportunity) => matchOpportunity(profile, opportunity))
      .sort((a, b) => b.score - a.score || a.opportunityId.localeCompare(b.opportunityId)),
    generatedAt: new Date().toISOString(),
    scoringVersion: "itapoa-v1",
  };
}
