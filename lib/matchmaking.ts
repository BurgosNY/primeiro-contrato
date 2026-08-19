import type { SupplierDemoProfile } from "@/lib/demo-profile";

export type MatchableOpportunity = {
  activity: string;
  service: string;
  summary: string;
  location: string;
  tags: string[];
  alerts?: string[];
  match: number;
};

export type MatchResult = {
  score: number;
  label: "Ótima opção" | "Boa opção" | "Vale revisar" | "Baixa aderência";
  reasons: string[];
  gaps: string[];
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function relevantTokens(value: string) {
  const ignored = new Set(["para", "com", "de", "da", "do", "das", "dos", "e", "em", "servico", "servicos", "atividade"]);
  return normalize(value).split(/[^a-z0-9]+/).filter((token) => token.length > 3 && !ignored.has(token));
}

export function matchOpportunity(opportunity: MatchableOpportunity, profile: SupplierDemoProfile): MatchResult {
  const reasons: string[] = [];
  const gaps: string[] = [];
  const profileCapabilities = profile.capabilities.map(normalize);
  const activity = normalize(opportunity.activity);
  const capabilityMatch = profileCapabilities.includes(activity);
  const profileTokens = new Set(relevantTokens(`${profile.mainActivity} ${profile.capabilities.join(" ")}`));
  const opportunityTokens = relevantTokens(`${opportunity.activity} ${opportunity.service} ${opportunity.summary}`);
  const tokenMatches = opportunityTokens.filter((token) => profileTokens.has(token)).length;

  let serviceScore = 8;
  if (capabilityMatch) {
    serviceScore = 36;
    reasons.push(`${opportunity.activity} está entre as capacidades confirmadas`);
  } else if (tokenMatches >= 2) {
    serviceScore = 26;
    reasons.push("O escopo tem termos compatíveis com a atividade cadastrada");
  } else if (tokenMatches === 1) {
    serviceScore = 18;
    reasons.push("Há compatibilidade parcial com a atividade cadastrada");
  } else {
    gaps.push(`${opportunity.activity} ainda não aparece no perfil confirmado`);
  }

  const targetLocation = normalize(profile.targetMunicipality);
  const locationMatch = Boolean(targetLocation && normalize(opportunity.location).includes(targetLocation));
  const locationScore = locationMatch ? 25 : 7;
  if (locationMatch) reasons.push(`Execução dentro da região escolhida: ${profile.targetMunicipality}`);
  else gaps.push(`Local fora da região principal de ${profile.targetMunicipality}`);

  const requiresMei = opportunity.tags.some((tag) => normalize(tag) === "mei");
  let eligibilityScore = 12;
  if (requiresMei && profile.isMei === true) {
    eligibilityScore = 18;
    reasons.push("Enquadramento MEI compatível");
  } else if (requiresMei && profile.isMei === false) {
    eligibilityScore = 0;
    gaps.push("O recorte exige MEI e o cadastro não confirma esse enquadramento");
  } else if (requiresMei && profile.isMei === null) {
    eligibilityScore = 8;
    gaps.push("Enquadramento MEI ainda precisa ser confirmado");
  }

  const riskScore = opportunity.alerts?.length ? Math.max(2, 10 - opportunity.alerts.length * 3) : 10;
  if (opportunity.alerts?.length) gaps.push(`${opportunity.alerts.length} ponto${opportunity.alerts.length > 1 ? "s" : ""} do edital pede revisão`);
  else reasons.push("Sem alerta crítico no snapshot");

  const catalogSignal = Math.round(Math.min(5, Math.max(2, opportunity.match / 20)));
  const score = Math.min(100, Math.max(0, serviceScore + locationScore + eligibilityScore + riskScore + catalogSignal));
  const label = score >= 92 ? "Ótima opção" : score >= 80 ? "Boa opção" : score >= 65 ? "Vale revisar" : "Baixa aderência";
  if (gaps.length < 2) gaps.push(`Valor não publicado; o limite de R$ ${Math.round(profile.contractLimit).toLocaleString("pt-BR")} não entrou no cálculo`);
  return { score, label, reasons: reasons.slice(0, 3), gaps: gaps.slice(0, 2) };
}
