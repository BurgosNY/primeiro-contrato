import type { ProviderProfile, SkillId } from "@/app/itapoa/domain";
import type { SupplierDemoProfile } from "@/lib/demo-profile";

const allSkillIds: SkillId[] = [
  "gutters_roofing", "masonry", "concrete_structures", "basic_plumbing", "drywall",
  "electrical", "metalwork", "signage", "outdoor_structures", "locksmith",
  "gate_automation", "sanitation_systems", "painting", "carpentry", "hvac",
  "cleaning", "landscaping", "other",
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function inferSkillIds(profile: SupplierDemoProfile): SkillId[] {
  const text = normalize([profile.mainActivity, ...profile.capabilities].join(" "));
  const skills = new Set<SkillId>();

  if (/calha|rufo|telhad|cobertura/.test(text)) skills.add("gutters_roofing");
  if (/pedre|alven|constr|obra|reparo|manutencao predial/.test(text)) skills.add("masonry");
  if (/concreto|pilar|fundacao/.test(text)) skills.add("concrete_structures");
  if (/hidraul|encan/.test(text)) skills.add("basic_plumbing");
  if (/drywall|gesso/.test(text)) skills.add("drywall");
  if (/eletr|energia/.test(text)) skills.add("electrical");
  if (/serral|metal|grade/.test(text)) skills.add("metalwork");
  if (/comunicacao visual|adesiv|impress/.test(text)) skills.add("signage");
  if (/outdoor|painel/.test(text)) skills.add("outdoor_structures");
  if (/chave|fechadura/.test(text)) skills.add("locksmith");
  if (/portao|automatiza/.test(text)) skills.add("gate_automation");
  if (/esgoto|saneamento|fossa/.test(text)) skills.add("sanitation_systems");
  if (/pintura|pintor/.test(text)) skills.add("painting");
  if (/carpint|marcen/.test(text)) skills.add("carpentry");
  if (/climat|refrig|ar condicionado/.test(text)) skills.add("hvac");
  if (/limpeza|conservacao/.test(text)) skills.add("cleaning");
  if (/jardin|paisag/.test(text)) skills.add("landscaping");

  return skills.size ? [...skills] : ["other"];
}

export function providerProfileFromOnboarding(source: SupplierDemoProfile, current: ProviderProfile): ProviderProfile {
  const inferred = inferSkillIds(source);
  const previousLevels = new Map(current.skills.map((skill) => [skill.id, skill.level]));

  return {
    ...current,
    id: source.cnpj.replace(/\D/g, "") || current.id,
    displayName: source.companyName,
    demoProfile: false,
    baseLocation: {
      city: source.targetMunicipality || source.municipality || current.baseLocation.city,
      state: (source.targetState || source.state || current.baseLocation.state).slice(0, 2).toUpperCase(),
      serviceRadiusKm: source.operatingRadiusKm,
    },
    skills: inferred.map((id) => ({
      id,
      level: previousLevels.get(id) ?? "experienced",
      evidence: "self_declared",
    })),
    exclusions: allSkillIds.filter((id) => !inferred.includes(id)),
    updatedAt: source.updatedAt,
  };
}
