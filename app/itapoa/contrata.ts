import type { PublicOpportunity, QualityFlag } from "./domain";

const BASE = "https://contratamaisbrasil.sistema.gov.br";
export const LISTING_URL = `${BASE}/oportunidades/?uf=SC&municipio=Itapo%C3%A1&status_oportunidade=abertas`;

const decode = (value: string) => value.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const text = (value?: string) => decode((value ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t\r\f\v]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
const attr = (html: string, name: string) => decode(html.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] ?? "");
const classText = (html: string, className: string) => text(html.match(new RegExp(`<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"))?.[1]);
const labeled = (html: string, label: string) => text(html.match(new RegExp(`<strong[^>]*>\\s*${label}:?\\s*<\\/strong>([\\s\\S]*?)<\\/p>`, "i"))?.[1]) || null;
const heading = (html: string, label: string) => text(html.match(new RegExp(`<h4[^>]*>[\\s\\S]*?${label}:?\\s*([\\s\\S]*?)<\\/h4>`, "i"))?.[1]) || null;
const spanValue = (html: string, label: string) => text(html.match(new RegExp(`<span[^>]*class=["'][^"']*text-up-6[^"']*["'][^>]*>\\s*${label}:?([\\s\\S]*?)<\\/span>`, "i"))?.[1]) || "";

async function fetchHtml(url: string) {
  let last: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "Primeiro-Contrato/1.0 (public read-only refresh)" }, signal: AbortSignal.timeout(35_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) { last = error; if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  throw new Error(`Falha ao coletar ${url}: ${last instanceof Error ? last.message : "erro de rede"}`);
}

type ListingCard = { opportunityId: string; sourceUrl: string; serviceName: string; requestingAgency: string; summary: string; proposalClosesAt: string; sourceStatus: string };
function parseListing(html: string) {
  const pageCount = Number(html.match(/<nav[^>]+class=["'][^"']*br-pagination[^"']*["'][^>]+data-total=["'](\d+)/i)?.[1] ?? "1");
  const markers = [...html.matchAll(/<div[^>]+class=["'][^"']*\bdemanda-card\b[^"']*["'][^>]*>/gi)];
  const cards: ListingCard[] = [];
  for (let i = 0; i < markers.length; i++) {
    const chunk = html.slice(markers[i].index, markers[i + 1]?.index ?? html.length);
    const link = chunk.match(/href=["'](\/oportunidades\/(\d+)\/?)['"]/i); if (!link) continue;
    const timerTag = chunk.match(/<input[^>]+class=["'][^"']*timer_limit[^"']*["'][^>]*>/i)?.[0] ?? "";
    const timerDiv = chunk.match(/<div[^>]+class=["'][^"']*\btimer\b[^"']*["'][^>]*>/i)?.[0] ?? "";
    cards.push({ opportunityId: link[2], sourceUrl: `${BASE}${link[1]}`, serviceName: classText(chunk, "titulo-servico"), requestingAgency: classText(chunk, "orgao-servico"),
      summary: text(chunk.match(/<p[^>]+class=["'][^"']*text-break[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]), proposalClosesAt: attr(timerTag, "value"), sourceStatus: attr(timerDiv, "data-status") || "open" });
  }
  return { pageCount, cards };
}

function quality(item: Omit<PublicOpportunity,"qualityFlags">): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const missing = [["description",item.description],["requestingAgency",item.requestingAgency],["executionLocation.city",item.executionLocation.city],["proposalClosesAt",item.proposalClosesAt]].filter(([,v]) => !v).map(([k]) => k as string);
  if (missing.length) flags.push({ code: "missing_structural_fields", kind: "verified", severity: "warning", fields: missing, evidence: "Campos públicos estruturados sem valor na página de detalhe." });
  const match = item.executionDeadlineRaw.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "").match(/(\d{1,2}) de ([a-z]+) de (\d{4})/);
  const months: Record<string,number> = { janeiro:0,fevereiro:1,marco:2,abril:3,maio:4,junho:5,julho:6,agosto:7,setembro:8,outubro:9,novembro:10,dezembro:11 };
  if (match && months[match[2]] !== undefined && item.proposalClosesAt) {
    const deadline = new Date(Number(match[3]), months[match[2]], Number(match[1]));
    if (deadline < new Date(item.proposalClosesAt)) flags.push({ code: "execution_before_proposal_close", kind: "verified", severity: "critical", evidence: `Execução publicada para ${deadline.toISOString().slice(0,10)}, antes do fechamento das propostas em ${item.proposalClosesAt}.` });
  }
  if (/\banex/i.test(item.description) && !item.attachments.length) flags.push({ code: "attachment_promised_but_absent", kind: "verified", severity: "critical", evidence: "A descrição menciona anexo(s), mas o HTML público não contém mídia do serviço." });
  return flags;
}

function parseDetail(html: string, card: ListingCard, capturedAt: string): PublicOpportunity {
  const description = text(html.match(/<p[^>]+style=["'][^"']*text-align:\s*justify[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]);
  const imageTags = [...html.matchAll(/<img[^>]+class=["'][^"']*\bmedia-item\b[^"']*["'][^>]*>/gi)];
  const base: Omit<PublicOpportunity,"qualityFlags"> = { opportunityId: card.opportunityId, sourceUrl: card.sourceUrl, sourceStatus: card.sourceStatus, capturedAt,
    activity: spanValue(html,"Atividade"), serviceName: text(html.match(/<span[^>]+class=["'][^"']*text-up-05[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]) || card.serviceName,
    specification: spanValue(html,"Especificação"), summaryFromListing: card.summary, description, requestingAgency: heading(html,"Órgão demandante") || card.requestingAgency,
    executionLocation: { name: heading(html,"Local de Execução"), street: labeled(html,"Logradouro"), number: labeled(html,"Número"), complement: labeled(html,"Complemento"), neighborhood: labeled(html,"Bairro"), city: labeled(html,"Cidade"), state: labeled(html,"Estado"), reference: labeled(html,"Ponto de referência") },
    proposalClosesAt: card.proposalClosesAt, executionDeadlineRaw: labeled(html,"Data limite de execução") ?? "", payment: { method: labeled(html,"Forma de pagamento"), term: labeled(html,"Prazo de pagamento") },
    onlyMei: (labeled(html,"Apenas MEI") ?? "").toLocaleLowerCase("pt-BR").startsWith("sim"), attachments: imageTags.map((tag,index) => ({ name: attr(tag[0],"alt") || `Imagem ${index+1}` })) };
  return { ...base, qualityFlags: quality(base) };
}

export async function collectLiveOpportunities() {
  const first = parseListing(await fetchHtml(LISTING_URL)); const cards = [...first.cards];
  for (let page = 2; page <= first.pageCount; page++) cards.push(...parseListing(await fetchHtml(`${LISTING_URL}&page=${page}`)).cards);
  const ids = new Set(cards.map((card) => card.opportunityId));
  if (ids.size !== cards.length) throw new Error("A paginação ao vivo retornou IDs duplicados.");
  const capturedAt = new Date().toISOString(); const results = new Array<PublicOpportunity>(cards.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(3, cards.length) }, async () => { while (cursor < cards.length) { const index = cursor++; const card = cards[index]; results[index] = parseDetail(await fetchHtml(card.sourceUrl), card, capturedAt); } }));
  return { opportunities: results, pageCount: first.pageCount, capturedAt };
}
