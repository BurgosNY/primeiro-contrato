import type { CapabilityId, ProviderProfile, SkillId, SkillLevel } from "./domain";

export const skillCatalog: Record<SkillId, { label: string; shortLabel: string }> = {
  gutters_roofing: { label: "Calhas, rufos e vedação", shortLabel: "Calhas e rufos" },
  masonry: { label: "Alvenaria e pequenos reparos", shortLabel: "Alvenaria" },
  concrete_structures: { label: "Bases, pilares e concreto", shortLabel: "Estruturas de concreto" },
  basic_plumbing: { label: "Hidráulica predial leve", shortLabel: "Hidráulica leve" },
  drywall: { label: "Remoção e recomposição de drywall", shortLabel: "Drywall" },
  electrical: { label: "Instalações elétricas prediais", shortLabel: "Elétrica predial" },
  metalwork: { label: "Serralheria e fabricação de grades", shortLabel: "Serralheria" },
  signage: { label: "Comunicação visual e adesivação", shortLabel: "Comunicação visual" },
  outdoor_structures: { label: "Manutenção de estruturas de outdoor", shortLabel: "Estruturas de outdoor" },
  locksmith: { label: "Chaveiro e fechaduras", shortLabel: "Chaveiro" },
  gate_automation: { label: "Automação de portões", shortLabel: "Portões automáticos" },
  sanitation_systems: { label: "Sistemas individuais de esgoto", shortLabel: "Tratamento de esgoto" },
  painting: { label: "Pintura predial", shortLabel: "Pintura" },
  carpentry: { label: "Carpintaria e marcenaria", shortLabel: "Carpintaria" },
  hvac: { label: "Climatização e refrigeração", shortLabel: "Climatização" },
  cleaning: { label: "Limpeza e conservação", shortLabel: "Limpeza" },
  landscaping: { label: "Jardinagem e paisagismo", shortLabel: "Jardinagem" },
  other: { label: "Outro serviço especializado", shortLabel: "Outro serviço" },
};

export const capabilityCatalog: Record<CapabilityId, string> = {
  technical_visit: "Faz vistoria e medição no local",
  materials_supply: "Inclui materiais no orçamento",
  local_transport: "Tem transporte próprio em Itapoá",
  site_cleanup: "Entrega o local limpo",
  waste_disposal: "Faz descarte de resíduos da obra",
};

export const levelLabels: Record<SkillLevel, string> = {
  basic: "Básico",
  experienced: "Experiente",
  specialist: "Especialista",
};

export const defaultProfile: ProviderProfile = {
  schemaVersion: "1.0",
  id: "jm-reparos-itapoa",
  displayName: "JM Reparos Prediais",
  ownerName: "João Martins",
  demoProfile: true,
  legal: {
    type: "MEI",
    status: "active",
    evidence: "demo_fixture",
  },
  baseLocation: {
    city: "Itapoá",
    state: "SC",
    serviceRadiusKm: 40,
  },
  teamSize: 2,
  skills: [
    { id: "gutters_roofing", level: "specialist", evidence: "self_declared" },
    { id: "masonry", level: "experienced", evidence: "self_declared" },
    { id: "concrete_structures", level: "experienced", evidence: "self_declared" },
    { id: "basic_plumbing", level: "experienced", evidence: "self_declared" },
    { id: "drywall", level: "basic", evidence: "self_declared" },
  ],
  capabilities: [
    "technical_visit",
    "materials_supply",
    "local_transport",
    "site_cleanup",
    "waste_disposal",
  ],
  exclusions: [
    "electrical",
    "metalwork",
    "signage",
    "outdoor_structures",
    "locksmith",
    "gate_automation",
    "sanitation_systems",
  ],
  updatedAt: "2026-08-19T17:55:00.000-03:00",
};

export const editableProfileSkillIds = Object.keys(skillCatalog) as SkillId[];
