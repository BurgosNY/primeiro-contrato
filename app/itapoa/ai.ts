import type { CapabilityId, OpportunityRequirement, PublicOpportunity, SkillId } from "./domain";
import { contentHash } from "./store";

export const REQUIREMENTS_MODEL = "gpt-5-mini-2025-08-07";
const skillIds: SkillId[] = ["gutters_roofing","masonry","concrete_structures","basic_plumbing","drywall","electrical","metalwork","signage","outdoor_structures","locksmith","gate_automation","sanitation_systems","painting","carpentry","hvac","cleaning","landscaping","other"];
const capabilityIds: CapabilityId[] = ["technical_visit","materials_supply","local_transport","site_cleanup","waste_disposal"];

export const requirementHash = (item: PublicOpportunity) => contentHash({ activity: item.activity, serviceName: item.serviceName, specification: item.specification, description: item.description, onlyMei: item.onlyMei, city: item.executionLocation.city, state: item.executionLocation.state });

function outputText(response: unknown) {
  const body = response as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  for (const item of body.output ?? []) for (const content of item.content ?? []) if (content.type === "output_text" && content.text) return content.text;
  throw new Error("A OpenAI não devolveu a saída estruturada esperada.");
}

export async function extractRequirements(opportunities: PublicOpportunity[], apiKey: string): Promise<OpportunityRequirement[]> {
  if (!apiKey) throw new Error("OPENAI_API_KEY não está disponível no backend.");
  const inputs = opportunities.map((item) => ({ opportunityId: item.opportunityId, activity: item.activity, serviceName: item.serviceName,
    specification: item.specification, description: item.description, onlyMei: item.onlyMei, city: item.executionLocation.city, state: item.executionLocation.state }));
  const schema = { type: "object", additionalProperties: false, required: ["requirements"], properties: { requirements: { type: "array", items: {
    type: "object", additionalProperties: false, required: ["opportunityId","summary","skills","capabilities","complexity","confidence"], properties: {
      opportunityId: { type: "string" }, summary: { type: "string" },
      skills: { type: "array", items: { type: "object", additionalProperties: false, required: ["id","importance","evidence"], properties: { id: { type: "string", enum: skillIds }, importance: { type: "string", enum: ["required","supporting"] }, evidence: { type: "string" } } } },
      capabilities: { type: "array", items: { type: "object", additionalProperties: false, required: ["id","required","evidence"], properties: { id: { type: "string", enum: capabilityIds }, required: { type: "boolean" }, evidence: { type: "string" } } } },
      complexity: { type: "string", enum: ["simple","multi_trade","specialized"] }, confidence: { type: "number", minimum: 0, maximum: 1 },
    }
  } } } };
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({
    model: REQUIREMENTS_MODEL, store: false,
    instructions: "Você extrai requisitos verificáveis de oportunidades públicas brasileiras. Use somente o texto fornecido, não presuma certificações nem competências. Escolha as categorias fechadas mais próximas; use other apenas quando nenhuma servir. Evidence deve ser um trecho curto ou paráfrase fiel do texto da própria oportunidade. Retorne exatamente um item para cada opportunityId.",
    input: JSON.stringify(inputs), text: { format: { type: "json_schema", name: "opportunity_requirements", strict: true, schema } }, max_output_tokens: 9000,
  }) });
  if (!response.ok) throw new Error(`OpenAI Responses API falhou (${response.status}): ${(await response.text()).slice(0, 300)}`);
  const parsed = JSON.parse(outputText(await response.json())) as { requirements: Omit<OpportunityRequirement,"model"|"extractedAt"|"contentHash">[] };
  const byId = new Map(opportunities.map((item) => [item.opportunityId, item]));
  if (parsed.requirements.length !== opportunities.length || parsed.requirements.some((item) => !byId.has(item.opportunityId))) throw new Error("A IA não reconciliou todos os IDs coletados.");
  const extractedAt = new Date().toISOString();
  return Promise.all(parsed.requirements.map(async (item) => ({ ...item, model: REQUIREMENTS_MODEL, extractedAt, contentHash: await requirementHash(byId.get(item.opportunityId) as PublicOpportunity) })));
}
