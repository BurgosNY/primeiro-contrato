"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import type { CompanyDocumentPreview, CompanyResearch, OnboardingChatMessage, OnboardingChatReply, OnboardingStage } from "@/lib/onboarding-contract";
import { clearOnboardingSession, profileFromCompany, readOnboardingSession, writeOnboardingSession, writeSupplierProfile } from "@/lib/demo-profile";

type UiMessage = OnboardingChatMessage & {
  id: string;
  artifact?: "company" | "documents" | "profile" | "ready";
};

const initialMessages: UiMessage[] = [
  { id: "welcome-1", role: "assistant", content: "Olá! Vou conhecer sua empresa e organizar um perfil confiável para encontrar oportunidades públicas." },
  { id: "welcome-2", role: "assistant", content: "Envie o CNPJ. Se quiser, inclua o site na mesma mensagem; eu busco o que já existe e peço sua confirmação antes de avançar." },
];

const stageProgress: Record<OnboardingStage, number> = {
  collect_company: 12,
  review_company: 38,
  review_documents: 58,
  review_profile: 76,
  preferences: 90,
  ready: 100,
};

export function NewUserOnboarding() {
  const [messages, setMessages] = useState<UiMessage[]>(initialMessages);
  const [stage, setStage] = useState<OnboardingStage>("collect_company");
  const [company, setCompany] = useState<CompanyResearch | null>(null);
  const [documents, setDocuments] = useState<CompanyDocumentPreview[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [lastFailedMessage, setLastFailedMessage] = useState("");
  const [hasHydrated, setHasHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readOnboardingSession();
      if (saved) {
        const normalizedMessages = saved.messages.map((item) => ({ ...item, content: item.content.replace("Belo Horizonte", "Itapoá") })) as UiMessage[];
        setMessages(normalizedMessages);
        setStage(saved.stage);
        setCompany(saved.company);
        setDocuments(saved.documents);
        setQuickReplies(saved.quickReplies.map((label) => label.replace("Belo Horizonte", "Itapoá")));
        if (saved.stage === "ready" && saved.company) {
          const preference = [...normalizedMessages].reverse().find((item) => item.role === "user")?.content ?? "Itapoá e região, até R$ 15 mil";
          writeSupplierProfile(profileFromCompany(saved.company, preference));
        }
      }
      setHasHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    writeOnboardingSession({ stage, messages, company, documents, quickReplies, savedAt: new Date().toISOString() });
  }, [company, documents, hasHydrated, messages, quickReplies, stage]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
  }, [messages, sending, error, quickReplies]);

  useEffect(() => {
    if (!sending || stage !== "collect_company") return;
    const timer = window.setInterval(() => setLoadingStep((current) => Math.min(current + 1, 2)), 1_500);
    return () => window.clearInterval(timer);
  }, [sending, stage]);

  function restart() {
    setMessages(initialMessages);
    setStage("collect_company");
    setCompany(null);
    setDocuments([]);
    setQuickReplies([]);
    setInput("");
    setError("");
    clearOnboardingSession();
  }

  async function sendMessage(raw: string, appendUser = true) {
    const message = raw.trim();
    if (!message || sending) return;
    const userMessage: UiMessage = { id: `user-${Date.now()}`, role: "user", content: message };
    const history = (appendUser ? [...messages, userMessage] : messages).map(({ role, content }) => ({ role, content }));
    if (appendUser) setMessages((current) => [...current, userMessage]);
    setInput("");
    setSending(true);
    setLoadingStep(0);
    setError("");
    setQuickReplies([]);

    const searchStartedAt = performance.now();
    try {
      const response = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, stage, history, context: { company, documents } }),
      });
      const payload = await response.json() as OnboardingChatReply | { error: string };
      if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "Não foi possível continuar.");
      if (stage === "collect_company") {
        const remaining = 1_200 - (performance.now() - searchStartedAt);
        if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
      }
      const artifact: UiMessage["artifact"] = payload.stage === "review_company" ? "company" : payload.stage === "review_documents" ? "documents" : payload.stage === "review_profile" ? "profile" : payload.stage === "ready" ? "ready" : undefined;
      setCompany(payload.company);
      setDocuments(payload.documents);
      setStage(payload.stage);
      setQuickReplies(payload.quickReplies);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", content: payload.message, artifact }]);
      if (payload.company && payload.stage === "ready") writeSupplierProfile(profileFromCompany(payload.company, message));
      setLastFailedMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não consegui consultar a IA agora.");
      setLastFailedMessage(message);
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-topbar">
        <Link className="identity-brand" href="/" aria-label="Primeiro Contrato — início"><span className="brand-mark">1º</span><span>Primeiro Contrato</span></Link>
          <div><span>Perfil {stageProgress[stage]}% · salvo</span><button type="button" onClick={restart}>Recomeçar</button><Link href="/">Trocar usuário</Link></div>
      </header>

      <section className="onboarding-chat" aria-label="Onboarding assistido" aria-busy={sending}>
        <header className="onboarding-chat-header">
          <span aria-hidden="true">✦</span>
          <div><strong>Agente Primeiro Contrato</strong><small><i /> conectado · dados com fonte</small></div>
          <div className="onboarding-progress" aria-label={`${stageProgress[stage]}% do perfil concluído`}><span style={{ transform: `scaleX(${stageProgress[stage] / 100})` }} /></div>
        </header>

        <div className="onboarding-thread" aria-live="polite">
          {messages.map((message) => message.role === "assistant" ? (
            <div key={message.id}>
              <AgentMessage>{message.content}</AgentMessage>
              {message.artifact === "company" && company ? <CompanyCard company={company} sourceCount={documents.length} /> : null}
              {message.artifact === "documents" ? <DocumentsCard documents={documents} /> : null}
              {message.artifact === "profile" && company ? <ProfileCard company={company} /> : null}
              {message.artifact === "ready" ? <div className="onboarding-ready artifact-enter"><span>✓</span><div><strong>Perfil pronto para o radar</strong><p>Dados, fontes e preferências ficaram organizados para o ranking.</p></div></div> : null}
            </div>
          ) : <UserMessage key={message.id}>{message.content}</UserMessage>)}

          {sending ? stage === "collect_company" ? <CompanySearchLoading step={loadingStep} /> : <AgentMessage status><span className="onboarding-spinner" aria-hidden="true" />Estou organizando sua resposta e atualizando o perfil…</AgentMessage> : null}
          {error ? <div className="onboarding-error" role="alert"><span>!</span><div><strong>Não consegui continuar</strong><p>{error}</p></div><button type="button" onClick={() => void sendMessage(lastFailedMessage, false)}>Tentar novamente</button></div> : null}
          {!sending && quickReplies.length ? <div className="onboarding-quick" aria-label="Respostas sugeridas">{quickReplies.map((label) => label === "Buscar oportunidades" ? <Link href="/itapoa" key={label}>Ver oportunidades →</Link> : <button type="button" key={label} onClick={() => void sendMessage(label)}>✓ {label}</button>)}</div> : null}
          <div ref={endRef} />
        </div>

        <form className="onboarding-composer" onSubmit={submit}>
          <label htmlFor="onboarding-message">Mensagem para o agente</label>
          <div><textarea id="onboarding-message" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={stage === "collect_company" ? "Digite o CNPJ e, se quiser, o site da empresa" : "Confirme, corrija ou faça uma pergunta"} rows={1} disabled={sending} /><button type="submit" disabled={sending || !input.trim()} aria-label="Enviar mensagem">→</button></div>
          <small>Enter para enviar · a IA pode errar; revise os dados e abra as fontes.</small>
        </form>
      </section>
    </main>
  );
}

function AgentMessage({ children, status = false }: { children: React.ReactNode; status?: boolean }) {
  return <div className={`onboarding-line agent ${status ? "status" : ""}`} role={status ? "status" : undefined}><span aria-hidden="true">✦</span><div><strong>Agente</strong><p>{children}</p></div></div>;
}

function CompanySearchLoading({ step }: { step: number }) {
  const steps = ["Validando o CNPJ", "Consultando dados cadastrais", "Buscando fontes verificáveis"];
  return <section className="company-search-loading artifact-enter" role="status" aria-live="polite">
    <header><span className="onboarding-spinner" aria-hidden="true" /><div><strong>Buscando dados da empresa</strong><p>{steps[step]}…</p></div><b>{step + 1} de {steps.length}</b></header>
    <div className="company-search-progress" aria-hidden="true"><span style={{ transform: `scaleX(${(step + 1) / steps.length})` }} /></div>
    <ol>{steps.map((label, index) => <li className={index < step ? "complete" : index === step ? "active" : ""} key={label}><span>{index < step ? "✓" : index + 1}</span>{label}</li>)}</ol>
    <small>Usamos somente fontes públicas e você confirma tudo antes de continuar.</small>
  </section>;
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return <div className="onboarding-line user"><div><p>{children}</p></div><span>Você</span></div>;
}

function CompanyCard({ company, sourceCount }: { company: CompanyResearch; sourceCount: number }) {
  return <section className="onboarding-artifact artifact-enter" aria-label="Dados cadastrais encontrados">
    <header><div><span>▦</span><div><small>Cadastro localizado</small><strong>{company.tradingName || company.legalName}</strong></div></div><b>✓ {sourceCount} fonte{sourceCount === 1 ? "" : "s"}</b></header>
    <dl><div><dt>CNPJ</dt><dd>{company.cnpj}</dd><small>{company.status}</small></div><div><dt>Enquadramento</dt><dd>{company.isMei === true ? "MEI" : company.size || "Não confirmado"}</dd><small>{company.isSimple === true ? "Optante pelo Simples" : "Regime a confirmar"}</small></div><div><dt>Atividade principal</dt><dd>{company.mainActivity || "Não localizada"}</dd></div><div><dt>Base</dt><dd>{[company.municipality, company.state].filter(Boolean).join("/") || "Não localizada"}</dd></div>{company.isMei === true ? <div><dt>Teto de referência</dt><dd>{company.annualCeiling}</dd><small>Confirme a regra vigente</small></div> : null}<div><dt>Início da atividade</dt><dd>{company.openedAt || "Não localizado"}</dd></div></dl>
    {company.sourceUrl ? <a href={company.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte cadastral ↗<span>{company.sourceLabel}</span></a> : null}
  </section>;
}

function DocumentsCard({ documents }: { documents: CompanyDocumentPreview[] }) {
  return <section className="onboarding-documents artifact-enter" aria-label="Fontes encontradas"><header><div><span>▤</span><div><strong>Fontes encontradas</strong><small>{documents.length} item{documents.length === 1 ? "" : "s"} para revisar</small></div></div><b>Preview</b></header>{documents.length ? <div>{documents.map((document) => <article key={document.id}><span>{document.kind === "certificate" ? "CERT" : document.kind === "registry" ? "CNPJ" : document.url.toLowerCase().includes(".pdf") ? "PDF" : "WEB"}</span><div><strong>{document.title}</strong><small>{document.domain}</small><p>{document.description}</p><a href={document.url} target="_blank" rel="noreferrer">Abrir fonte original ↗</a></div></article>)}</div> : <p>Nenhum documento verificável foi localizado. O agente não criará previews fictícios.</p>}</section>;
}

function ProfileCard({ company }: { company: CompanyResearch }) {
  return <section className="onboarding-artifact artifact-enter"><header><div><span>✓</span><div><small>Perfil para revisão</small><strong>{company.tradingName || company.legalName}</strong></div></div><b>Rastreável</b></header><dl><div><dt>Atuação</dt><dd>{company.mainActivity || "A confirmar"}</dd></div><div><dt>Base</dt><dd>{[company.municipality, company.state].filter(Boolean).join("/") || "A confirmar"}</dd></div><div><dt>Raio inicial</dt><dd>40 km</dd><small>Editável</small></div><div><dt>Confiabilidade</dt><dd>{company.verificationStatus === "verified" ? "Cadastro localizado" : "Revisão necessária"}</dd></div></dl></section>;
}
