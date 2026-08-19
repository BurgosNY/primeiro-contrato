import type { CompanyDocumentPreview, CompanyResearch, OnboardingChatMessage, OnboardingStage } from "@/lib/onboarding-contract";

export const PROFILE_STORAGE_KEY = "primeiro-contrato:supplier-profile:v2";
export const ONBOARDING_STORAGE_KEY = "primeiro-contrato:onboarding:v1";
export const PLATFORM_STORAGE_KEY = "primeiro-contrato:platform-state:v1";

export type SupplierDemoProfile = {
  companyName: string;
  legalName: string;
  cnpj: string;
  mainActivity: string;
  municipality: string;
  state: string;
  targetMunicipality: string;
  targetState: string;
  operatingRadiusKm: number;
  contractLimit: number;
  isMei: boolean | null;
  isSimple: boolean | null;
  capabilities: string[];
  source: "demo" | "onboarding";
  updatedAt: string;
};

export type PersistedOnboardingSession = {
  stage: OnboardingStage;
  messages: Array<OnboardingChatMessage & { id: string; artifact?: "company" | "documents" | "profile" | "ready" }>;
  company: CompanyResearch | null;
  documents: CompanyDocumentPreview[];
  quickReplies: string[];
  savedAt: string;
};

export const DEFAULT_DEMO_PROFILE: SupplierDemoProfile = {
  companyName: "JM Reparos",
  legalName: "JM Reparos e Manutenção",
  cnpj: "Perfil de demonstração",
  mainActivity: "Manutenção predial, elétrica e pequenos reparos",
  municipality: "Itapoá",
  state: "SC",
  targetMunicipality: "Itapoá",
  targetState: "SC",
  operatingRadiusKm: 40,
  contractLimit: 15_000,
  isMei: true,
  isSimple: true,
  capabilities: ["Pedreiro", "Eletricista", "Encanador"],
  source: "demo",
  updatedAt: "2026-08-19T15:00:00-03:00",
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function inferCapabilities(activity: string) {
  const value = normalize(activity);
  const capabilities = new Set<string>();
  if (/constr|pedre|alven|obra|reparo|manutencao predial/.test(value)) capabilities.add("Pedreiro");
  if (/eletr|energia|instalacao predial/.test(value)) capabilities.add("Eletricista");
  if (/hidraul|encan|saneamento|esgoto/.test(value)) capabilities.add("Encanador");
  if (/chave|fechadura/.test(value)) capabilities.add("Chaveiro");
  if (/comunicacao visual|painel|adesiv|impress/.test(value)) capabilities.add("Instalador de painéis");
  return [...capabilities];
}

export function profileFromCompany(company: CompanyResearch, preference = ""): SupplierDemoProfile {
  const prefersItapoa = /itapo[aá]/i.test(preference);
  const limitMatch = preference.match(/R\$\s?([\d.,]+)/i);
  const parsedLimit = limitMatch ? Number(limitMatch[1].replace(/\./g, "").replace(",", ".")) : 15_000;
  return {
    companyName: company.tradingName || company.legalName || "Empresa em análise",
    legalName: company.legalName || company.tradingName,
    cnpj: company.cnpj,
    mainActivity: company.mainActivity || "Atividade a confirmar",
    municipality: company.municipality || "Não informada",
    state: company.state || "",
    targetMunicipality: prefersItapoa ? "Itapoá" : company.municipality || "Itapoá",
    targetState: prefersItapoa ? "SC" : company.state || "SC",
    operatingRadiusKm: 40,
    contractLimit: Number.isFinite(parsedLimit) ? parsedLimit : 15_000,
    isMei: company.isMei,
    isSimple: company.isSimple,
    capabilities: inferCapabilities(company.mainActivity),
    source: "onboarding",
    updatedAt: new Date().toISOString(),
  };
}

export function readSupplierProfile() {
  if (typeof window === "undefined") return DEFAULT_DEMO_PROFILE;
  try {
    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    return stored ? { ...DEFAULT_DEMO_PROFILE, ...JSON.parse(stored) as SupplierDemoProfile } : DEFAULT_DEMO_PROFILE;
  } catch {
    return DEFAULT_DEMO_PROFILE;
  }
}

export function writeSupplierProfile(profile: SupplierDemoProfile) {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function readOnboardingSession(): PersistedOnboardingSession | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return stored ? JSON.parse(stored) as PersistedOnboardingSession : null;
  } catch {
    return null;
  }
}

export function writeOnboardingSession(session: PersistedOnboardingSession) {
  window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(session));
}

export function clearOnboardingSession() {
  window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

export function readPlatformState(): { selectedId: string; viewMode: "summary" | "map"; onlyHighMatch: boolean } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(PLATFORM_STORAGE_KEY);
    return stored ? JSON.parse(stored) as { selectedId: string; viewMode: "summary" | "map"; onlyHighMatch: boolean } : null;
  } catch {
    return null;
  }
}

export function writePlatformState(state: { selectedId: string; viewMode: "summary" | "map"; onlyHighMatch: boolean }) {
  window.localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(state));
}

export function companyInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const firstWord = words[0] ?? "";
  if (/^[A-Z0-9]{2,3}$/.test(firstWord)) return firstWord.slice(0, 2);
  return (words.length > 1 ? `${firstWord[0]}${words[1][0]}` : firstWord.slice(0, 2) || "PC").toUpperCase();
}
