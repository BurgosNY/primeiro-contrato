import OpenAI from "openai";

import { findCnpj, isValidCnpj, normalizeCnpj } from "@/lib/cnpj";
import type {
  CompanyDocumentPreview,
  CompanyResearch,
  OnboardingChatMessage,
  OnboardingChatReply,
  OnboardingChatRequest,
  OnboardingStage,
} from "@/lib/onboarding-contract";

const CHAT_MODEL = process.env.OPENAI_ONBOARDING_MODEL ?? "gpt-4o-mini";
const SEARCH_MODEL = process.env.OPENAI_ONBOARDING_SEARCH_MODEL ?? "gpt-4.1-mini";
const MEI_CEILING_SOURCE = "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/perguntas-frequentes/o-que-e-o-microempreendedor-individual-mei/qual-o-faturamento-anual-do";

type RegistryPayload = Record<string, unknown>;

type ModelDecision = {
  intent: "confirm" | "correct" | "question" | "preferences" | "unknown";
  message: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function formatCnpj(cnpj: string) {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function registryToCompany(cnpj: string, payload: RegistryPayload): CompanyResearch {
  const street = [asString(payload.descricao_tipo_de_logradouro), asString(payload.logradouro), asString(payload.numero)].filter(Boolean).join(" ");
  const address = [street, asString(payload.bairro), asString(payload.cep)].filter(Boolean).join(" · ");
  const isMei = asBoolean(payload.opcao_pelo_mei);

  return {
    cnpj: formatCnpj(cnpj),
    legalName: asString(payload.razao_social),
    tradingName: asString(payload.nome_fantasia) || asString(payload.razao_social),
    status: asString(payload.descricao_situacao_cadastral) || "Situação não informada",
    openedAt: asString(payload.data_inicio_atividade),
    legalNature: asString(payload.natureza_juridica),
    size: asString(payload.porte),
    mainActivity: asString(payload.cnae_fiscal_descricao),
    municipality: asString(payload.municipio),
    state: asString(payload.uf),
    address,
    isMei,
    isSimple: asBoolean(payload.opcao_pelo_simples),
    annualCeiling: isMei === true ? "R$ 81.000/ano · proporcional no ano de abertura" : "Não se aplica ou precisa de confirmação",
    verificationStatus: asString(payload.razao_social) ? "verified" : "partial",
    sourceLabel: "BrasilAPI · base pública agregada de CNPJ",
    sourceUrl: `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
  };
}

async function fetchRegistry(cnpj: string) {
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { Accept: "application/json", "User-Agent": "PrimeiroContrato/1.0" },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return registryToCompany(cnpj, await response.json() as RegistryPayload);
}

function collectSearchSources(response: unknown): CompanyDocumentPreview[] {
  const found = new Map<string, CompanyDocumentPreview>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const item = value as Record<string, unknown>;
    const url = asString(item.url);
    if (url.startsWith("http") && !found.has(url)) {
      try {
        const parsed = new URL(url);
        const title = asString(item.title) || parsed.hostname.replace(/^www\./, "");
        const lower = `${title} ${parsed.pathname}`.toLowerCase();
        const kind: CompanyDocumentPreview["kind"] = lower.includes("certid")
          ? "certificate"
          : lower.endsWith(".pdf") || lower.includes("document")
            ? "document"
            : lower.includes("cnpj") || lower.includes("receita")
              ? "registry"
              : "source";
        found.set(url, {
          id: `source-${found.size + 1}`,
          title,
          kind,
          domain: parsed.hostname.replace(/^www\./, ""),
          url,
          description: "Fonte localizada pela pesquisa. Abra para revisar o conteúdo original antes de confirmar.",
          verificationStatus: "located",
        });
      } catch {
        // Ignora URLs malformadas retornadas por uma fonte externa.
      }
    }
    Object.values(item).forEach(visit);
  };
  visit(response);
  return [...found.values()].slice(0, 6);
}

async function searchCompanySources(client: OpenAI, cnpj: string, website: string) {
  const response = await client.responses.create({
    model: SEARCH_MODEL,
    tools: [{ type: "web_search" }],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    input: `Pesquise fontes públicas e documentos verificáveis da empresa de CNPJ ${formatCnpj(cnpj)}${website ? ` e site informado ${website}` : ""}. Priorize Receita Federal, gov.br, Junta Comercial, prefeitura e o domínio oficial. Não invente documentos nem URLs. Responda em no máximo 120 palavras.`,
    max_output_tokens: 220,
  });
  return collectSearchSources(response.output);
}

function fallbackCompany(cnpj: string): CompanyResearch {
  return {
    cnpj: formatCnpj(cnpj), legalName: "", tradingName: "Empresa não localizada", status: "Não confirmado", openedAt: "", legalNature: "", size: "", mainActivity: "", municipality: "", state: "", address: "", isMei: null, isSimple: null, annualCeiling: "Precisa de confirmação", verificationStatus: "not_found", sourceLabel: "Pesquisa sem correspondência cadastral confirmada", sourceUrl: "",
  };
}

function registryPreview(company: CompanyResearch): CompanyDocumentPreview {
  return {
    id: "registry-cnpj",
    title: `Consulta cadastral · ${company.cnpj}`,
    kind: "registry",
    domain: "brasilapi.com.br",
    url: company.sourceUrl,
    description: "Dados cadastrais agregados a partir de bases públicas. Confirme no comprovante oficial antes de usar em uma proposta.",
    verificationStatus: "reference",
  };
}

function meiRulePreview(): CompanyDocumentPreview {
  return {
    id: "mei-ceiling",
    title: "Regra oficial de faturamento do MEI",
    kind: "document",
    domain: "gov.br",
    url: MEI_CEILING_SOURCE,
    description: "Referência oficial para teto anual e proporcionalidade no ano de abertura.",
    verificationStatus: "reference",
  };
}

function stageAfter(stage: OnboardingStage, intent: ModelDecision["intent"]): OnboardingStage {
  if (intent !== "confirm" && intent !== "preferences") return stage;
  if (stage === "review_company") return "review_documents";
  if (stage === "review_documents") return "review_profile";
  if (stage === "review_profile") return "preferences";
  if (stage === "preferences") return "ready";
  return stage;
}

function quickReplies(stage: OnboardingStage) {
  if (stage === "review_company") return ["Confirmar dados", "Quero corrigir uma informação"];
  if (stage === "review_documents") return ["Usar documentos encontrados", "Pesquisar mais fontes"];
  if (stage === "review_profile") return ["Confirmar perfil", "Quero corrigir o perfil"];
  if (stage === "preferences") return ["Itapoá e região, até R$ 15 mil", "Quero informar outras preferências"];
  if (stage === "ready") return ["Buscar oportunidades"];
  return [];
}

async function decide(client: OpenAI, request: OnboardingChatRequest): Promise<ModelDecision> {
  const history = request.history.slice(-8).map((item: OnboardingChatMessage) => ({ role: item.role, content: item.content }));
  const response = await client.responses.create({
    model: CHAT_MODEL,
    input: [
      {
        role: "system",
        content: `Você é o agente de onboarding do Primeiro Contrato, plataforma para pequenos fornecedores venderem ao governo. Responda em português do Brasil, em até 70 palavras, com linguagem simples. Estado atual: ${request.stage}. Classifique a intenção do último usuário. Nunca afirme que um dado cadastral ou documento foi verificado sem uma fonte presente no contexto. Se o usuário confirmar, explique objetivamente o próximo passo. Se perguntar algo, responda e mantenha o estado.`,
      },
      ...history,
      { role: "user", content: request.message },
    ],
    max_output_tokens: 220,
    text: {
      format: {
        type: "json_schema",
        name: "onboarding_decision",
        strict: true,
        schema: {
          type: "object",
          properties: {
            intent: { type: "string", enum: ["confirm", "correct", "question", "preferences", "unknown"] },
            message: { type: "string" },
          },
          required: ["intent", "message"],
          additionalProperties: false,
        },
      },
    },
  });
  return JSON.parse(response.output_text) as ModelDecision;
}

export async function runOnboardingChat(request: OnboardingChatRequest): Promise<OnboardingChatReply> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada no servidor.");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const cnpj = findCnpj(request.message);

  if (/pesquisar mais fontes/i.test(request.message) && request.context.company) {
    const companyCnpj = normalizeCnpj(request.context.company.cnpj);
    const searched = await searchCompanySources(client, companyCnpj, "").catch(() => []);
    const documents = [...request.context.documents, ...searched].filter((item, index, items) => items.findIndex((candidate) => candidate.url === item.url) === index).slice(0, 8);
    return {
      message: searched.length ? `Pesquisei novamente e agora há ${documents.length} fontes únicas para você revisar.` : "A nova pesquisa não encontrou fontes adicionais verificáveis. Mantive somente os itens que já estavam no histórico.",
      stage: "review_documents",
      company: request.context.company,
      documents,
      quickReplies: quickReplies("review_documents"),
      model: SEARCH_MODEL,
      usedWebSearch: true,
    };
  }

  if (cnpj) {
    if (!isValidCnpj(cnpj)) {
      return { message: "Esse CNPJ não passou na validação dos dígitos. Confira os 14 números e envie novamente.", stage: "collect_company", company: null, documents: [], quickReplies: [], model: CHAT_MODEL, usedWebSearch: false };
    }

    const website = request.message.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z]{2,})+(?:\/\S*)?/i)?.[0] ?? "";
    const company = await fetchRegistry(cnpj).catch(() => null) ?? fallbackCompany(cnpj);
    const searched = await searchCompanySources(client, cnpj, website).catch(() => []);
    const documents = [
      ...(company.sourceUrl ? [registryPreview(company)] : []),
      ...(company.isMei === true ? [meiRulePreview()] : []),
      ...searched,
    ].filter((item, index, items) => items.findIndex((candidate) => candidate.url === item.url) === index).slice(0, 6);

    const found = company.verificationStatus !== "not_found";
    return {
      message: found
        ? `Localizei o cadastro de ${company.tradingName || company.legalName} e ${documents.length} fonte${documents.length === 1 ? "" : "s"} para revisão. Confira os dados abaixo; eu só avanço depois da sua confirmação.`
        : "Não encontrei uma correspondência cadastral confiável para esse CNPJ. Mantive o número na conversa, mas não preenchi os campos para evitar dados inventados. Você pode conferir o número ou enviar o comprovante.",
      stage: found ? "review_company" : "collect_company",
      company,
      documents,
      quickReplies: found ? quickReplies("review_company") : [],
      model: searched.length ? SEARCH_MODEL : CHAT_MODEL,
      usedWebSearch: searched.length > 0,
    };
  }

  if (request.stage === "collect_company") {
    const response = await client.responses.create({
      model: CHAT_MODEL,
      input: `Você é o agente de onboarding do Primeiro Contrato. O usuário disse: ${request.message}. Responda em português do Brasil, em até 55 palavras. Explique que precisa de um CNPJ válido; o site é opcional. Se houver uma pergunta, responda brevemente sem inventar dados cadastrais.`,
      max_output_tokens: 120,
    });
    return { message: response.output_text, stage: request.stage, company: request.context.company, documents: request.context.documents, quickReplies: [], model: CHAT_MODEL, usedWebSearch: false };
  }

  const decision = await decide(client, request);
  const nextStage = stageAfter(request.stage, decision.intent);
  const stageMessage = nextStage === "review_documents"
    ? "Dados confirmados. Separei abaixo as fontes realmente localizadas. Você pode abrir cada uma antes de autorizar o uso na análise do perfil."
    : nextStage === "review_profile"
      ? "Vou usar somente os dados e fontes confirmados. Organizei o perfil operacional para sua revisão; nenhuma inferência será tratada como documento oficial."
      : nextStage === "preferences"
        ? "Perfil confirmado. Agora me diga a região prioritária, o valor máximo por contrato e o serviço que você quer priorizar."
        : nextStage === "ready"
          ? "Preferências registradas. O perfil está pronto para buscar e classificar oportunidades; você ainda poderá revisar tudo antes de participar."
          : decision.message;

  return { message: stageMessage, stage: nextStage, company: request.context.company, documents: request.context.documents, quickReplies: quickReplies(nextStage), model: CHAT_MODEL, usedWebSearch: false };
}
