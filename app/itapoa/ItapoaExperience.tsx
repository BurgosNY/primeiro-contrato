"use client";

import { useEffect, useMemo, useState } from "react";

import { companyInitials, DEFAULT_DEMO_PROFILE, readPlatformState, readSupplierProfile, type SupplierDemoProfile, writePlatformState } from "@/lib/demo-profile";
import { matchOpportunity } from "@/lib/matchmaking";
import { OpportunityMap } from "./OpportunityMap";

type Opportunity = {
  id: string;
  activity: string;
  service: string;
  summary: string;
  description: string;
  match: number;
  location: string;
  agency: string;
  proposalDeadline: string;
  executionDeadline: string;
  payment: string;
  attachments: number;
  alerts?: string[];
  tags: string[];
};

const opportunities: Opportunity[] = [
  {
    id: "12908",
    activity: "Pedreiro",
    service: "Instalação de calhas e rufos",
    summary: "Cerca de 15 m de calhas e 22 m de rufos, com vedação, teste de estanqueidade e limpeza final.",
    description: "Contratação urgente para instalar aproximadamente 15 metros lineares de calhas e 22 metros lineares de rufos na Biblioteca Municipal, incluindo materiais, mão de obra, acessórios, fixadores, vedações, conexões, adequações, testes de estanqueidade e limpeza final. Os quantitativos devem ser conferidos por vistoria e medição no local antes da fabricação e instalação.",
    match: 96,
    location: "Itapema do Norte · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-20T10:44:25-03:00",
    executionDeadline: "24 de agosto de 2026",
    payment: "Empenho",
    attachments: 0,
    tags: ["MEI", "Materiais inclusos", "Vistoria necessária"],
  },
  {
    id: "12670",
    activity: "Eletricista",
    service: "Adequação elétrica e infraestrutura para câmeras",
    summary: "Novas tomadas, quadro de distribuição e infraestrutura física para oito câmeras na garagem da SEINFRA.",
    description: "Ampliação e adequação das instalações elétricas da Garagem da SEINFRA, com seis tomadas monofásicas, seis tomadas bifásicas, novo quadro de distribuição e infraestrutura física, elétrica e de cabeamento para oito câmeras. A ativação lógica das câmeras será feita posteriormente pelo setor de tecnologia da Prefeitura.",
    match: 93,
    location: "Paese · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-19T13:55:40-03:00",
    executionDeadline: "22 de agosto de 2026",
    payment: "Empenho",
    attachments: 0,
    tags: ["MEI", "Elétrica predial", "Visita obrigatória"],
  },
  {
    id: "12770",
    activity: "Chaveiro",
    service: "Abertura de porta e troca de fechadura",
    summary: "Abertura de porta interna do CRAS e substituição da fechadura, incluindo material e deslocamento.",
    description: "Serviço de chaveiro no CRAS para abertura de uma porta interna e troca da fechadura. O orçamento deve incluir mão de obra e material. Prestadores de outras cidades também devem incluir deslocamento, alimentação e hospedagem.",
    match: 91,
    location: "Centro · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-19T13:55:56-03:00",
    executionDeadline: "19 de agosto de 2026",
    payment: "Empenho",
    attachments: 0,
    tags: ["MEI", "Serviço rápido", "Material incluso"],
  },
  {
    id: "12672",
    activity: "Encanador",
    service: "Remanejamento de bebedouro e novo ponto de água",
    summary: "Retirada, transporte e reinstalação do bebedouro, com tubulação, conexões, registros e testes.",
    description: "Remanejamento de um bebedouro para um novo local, incluindo retirada, transporte, reinstalação, criação de novo ponto de água, tubulações, conexões, registros e testes de estanqueidade e funcionamento.",
    match: 89,
    location: "Itapema do Norte · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-19T13:55:21-03:00",
    executionDeadline: "22 de agosto de 2026",
    payment: "Empenho",
    attachments: 2,
    tags: ["MEI", "Hidráulica", "2 fotos"],
  },
  {
    id: "12800",
    activity: "Eletricista",
    service: "Kit completo para portão eletrônico",
    summary: "Motor, cremalheira, roldanas, controles, botoeira, solda e ajustes no portão de entrada de uma creche.",
    description: "Instalação de kit completo de portão eletrônico na Creche Primeiros Passos, incluindo motor, 2,35 metros de cremalheira, par de roldanas blindadas, controles, botoeira, solda e ajustes da guia e do batente.",
    match: 87,
    location: "Itapema do Norte · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-20T15:18:59-03:00",
    executionDeadline: "24 de agosto de 2026",
    payment: "Transferência",
    attachments: 10,
    alerts: ["A categoria pública não descreve todo o escopo"],
    tags: ["MEI", "10 fotos", "Motor incluso"],
  },
  {
    id: "12888",
    activity: "Pedreiro",
    service: "Grades para 16 janelas do CRAS",
    summary: "Fabricação sob medida, pintura eletrostática branca e instalação externa completa.",
    description: "Confecção, fornecimento e instalação de grades externas em 16 janelas do CRAS. As grades devem usar tubo metálico, barras de aproximadamente 2 cm, espaçamento aproximado de 8 cm e pintura eletrostática branca.",
    match: 84,
    location: "Samambaial · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-21T09:49:45-03:00",
    executionDeadline: "20 de agosto de 2026",
    payment: "Empenho",
    attachments: 1,
    alerts: ["Execução publicada antes do fechamento das propostas"],
    tags: ["MEI", "1 anexo", "Prazo inconsistente"],
  },
  {
    id: "12766",
    activity: "Instalador de painéis",
    service: "Manutenção de quatro outdoors",
    summary: "Reposição de elementos estruturais e instalação de quatro lonas impressas para uso externo.",
    description: "Manutenção e reposição dos elementos necessários em quatro estruturas de outdoors de madeira, incluindo mão de obra, materiais, transporte e quatro lonas externas de 1,85 m por 3,85 m.",
    match: 80,
    location: "Itapema do Norte · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-20T15:18:42-03:00",
    executionDeadline: "28 de agosto de 2026",
    payment: "Empenho",
    attachments: 0,
    tags: ["MEI", "Impressão", "Instalação externa"],
  },
  {
    id: "12673",
    activity: "Pedreiro",
    service: "Criação de cozinha na Sala do Empreendedor",
    summary: "Alvenaria, porta, elétrica, hidráulica, remoção de drywall e descarte de resíduos.",
    description: "Adequações físicas para criação de cozinha de aproximadamente 15 m² na Sala do Empreendedor, com paredes, porta, instalações elétricas e hidráulicas, fechamento de corredor e remoção de parede em drywall.",
    match: 76,
    location: "Itapema do Norte · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-19T13:55:13-03:00",
    executionDeadline: "29 de agosto de 2026",
    payment: "Empenho",
    attachments: 0,
    alerts: ["Demanda multidisciplinar: alvenaria, elétrica e hidráulica"],
    tags: ["MEI", "Obra multidisciplinar", "Vistoria"],
  },
  {
    id: "12889",
    activity: "Pedreiro",
    service: "Grades para três portas do CRAS",
    summary: "Grades externas sob medida, incluindo fabricação, transporte, pintura e instalação.",
    description: "Confecção e instalação de grades externas para três portas do CRAS, com tubos metálicos, pintura eletrostática branca, materiais, transporte, fixação e acabamento completo.",
    match: 73,
    location: "Samambaial · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-21T09:48:35-03:00",
    executionDeadline: "20 de agosto de 2026",
    payment: "Empenho",
    attachments: 0,
    alerts: ["O texto promete medidas e fotos, mas não há anexos", "Execução anterior ao fechamento das propostas"],
    tags: ["MEI", "Anexo ausente", "Prazo inconsistente"],
  },
  {
    id: "12648",
    activity: "Encanador",
    service: "Sistema individual de tratamento de esgoto",
    summary: "Solução sanitária completa para posto de guarda-vidas, com reatores, tubulações e infiltração.",
    description: "Fornecimento e instalação de sistema individual de tratamento de esgoto para o Posto Guarda-Vidas nº 12, com capacidade mínima de 100 litros por dia, incluindo caixa de areia, tanque séptico, filtro anaeróbio e sumidouro ou vala de infiltração.",
    match: 67,
    location: "Itapema do Norte · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-24T08:09:31-03:00",
    executionDeadline: "20 de agosto de 2026",
    payment: "Empenho",
    attachments: 6,
    alerts: ["Execução publicada antes do fechamento das propostas"],
    tags: ["MEI", "6 anexos", "Maior complexidade"],
  },
  {
    id: "12644",
    activity: "Pedreiro",
    service: "Pilares de concreto para dois contêineres",
    summary: "Pilares elevados para reduzir risco de alagamento, com material, equipamentos e descarte.",
    description: "Execução de pilares de concreto com manilhas para elevar e apoiar dois contêineres usados como depósito, reduzindo o risco de alagamentos e garantindo estabilidade.",
    match: 64,
    location: "Itapema do Norte · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-24T08:09:49-03:00",
    executionDeadline: "20 de agosto de 2026",
    payment: "Empenho",
    attachments: 6,
    alerts: ["Execução publicada antes do fechamento das propostas"],
    tags: ["MEI", "6 imagens", "Vistoria obrigatória"],
  },
  {
    id: "12500",
    activity: "Instalador de painéis",
    service: "Perfurite para portas e janelas do CRAS",
    summary: "Confecção e aplicação de adesivo perfurado para reforço visual e segurança patrimonial.",
    description: "Confecção e instalação de perfurite nas portas e janelas do CRAS, incluindo materiais, fabricação, transporte e aplicação completa. A arte oficial será fornecida pela Administração.",
    match: 58,
    location: "Samambaial · Itapoá",
    agency: "Prefeitura Municipal de Itapoá",
    proposalDeadline: "2026-08-22T08:09:59-03:00",
    executionDeadline: "17 de agosto de 2026",
    payment: "Empenho",
    attachments: 5,
    alerts: ["Execução publicada antes do fechamento das propostas"],
    tags: ["MEI", "5 imagens", "Prazo inconsistente"],
  },
];

const formatDeadline = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    .format(new Date(value))
    .replace(".", "");

const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

export function ItapoaExperience() {
  const [selectedId, setSelectedId] = useState("12908");
  const [viewMode, setViewMode] = useState<"summary" | "map">("summary");
  const [onlyHighMatch, setOnlyHighMatch] = useState(false);
  const [panelMode, setPanelMode] = useState<"detail" | "conversation" | "application">("detail");
  const [conversationStep, setConversationStep] = useState(0);
  const [conversationAnswers, setConversationAnswers] = useState<{ visit?: string; materials?: string }>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [supplierProfile, setSupplierProfile] = useState<SupplierDemoProfile>(DEFAULT_DEMO_PROFILE);
  const [platformHydrated, setPlatformHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSupplierProfile(readSupplierProfile());
      const saved = readPlatformState();
      if (saved) {
        setSelectedId(saved.selectedId);
        setViewMode(saved.viewMode);
        setOnlyHighMatch(saved.onlyHighMatch);
      }
      setPlatformHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!platformHydrated) return;
    writePlatformState({ selectedId, viewMode, onlyHighMatch });
  }, [onlyHighMatch, platformHydrated, selectedId, viewMode]);

  const rankedOpportunities = useMemo(
    () => opportunities
      .map((opportunity) => ({ ...opportunity, matchResult: matchOpportunity(opportunity, supplierProfile) }))
      .sort((a, b) => b.matchResult.score - a.matchResult.score),
    [supplierProfile],
  );
  const highMatchCount = rankedOpportunities.filter((item) => item.matchResult.score >= 75).length;
  const highFilterActive = onlyHighMatch && highMatchCount > 0;

  const selected = rankedOpportunities.find((item) => item.id === selectedId) ?? rankedOpportunities[0];
  const visibleOpportunities = useMemo(
    () => rankedOpportunities.filter((item) => !highFilterActive || item.matchResult.score >= 75),
    [highFilterActive, rankedOpportunities],
  );
  const profileInitials = companyInitials(supplierProfile.companyName);
  const profileCompletion = supplierProfile.source === "onboarding" ? 100 : 78;

  const chooseOpportunity = (id: string) => {
    setSelectedId(id);
    setPanelMode("detail");
    setConversationStep(0);
    setConversationAnswers({});
    setDraftReady(false);
  };

  const startConversation = () => {
    setPanelMode("conversation");
    setConversationStep(0);
    setConversationAnswers({});
  };

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Primeiro Contrato — início">
          <span className="brand-mark">1º</span><span>Primeiro Contrato</span>
        </a>
        <nav className="nav" aria-label="Navegação principal">
          <button className={`nav-item ${panelMode === "detail" ? "active" : ""}`} type="button" onClick={() => setPanelMode("detail")}><span aria-hidden="true">◫</span> Oportunidades <b>{rankedOpportunities.length}</b></button>
          <button className={`nav-item ${panelMode === "conversation" ? "active" : ""}`} type="button" onClick={startConversation}><span aria-hidden="true">◎</span> Conversa guiada</button>
          <button className={`nav-item ${panelMode === "application" ? "active" : ""}`} type="button" onClick={() => setPanelMode("application")}><span aria-hidden="true">✓</span> Participação <b>1</b></button>
        </nav>
        <div className="profile-card">
          <div className="profile-row"><span className="avatar">{profileInitials}</span><span><strong>{supplierProfile.companyName}</strong><small>{supplierProfile.mainActivity}</small></span></div>
          <div className="profile-progress"><span style={{ transform: `scaleX(${profileCompletion / 100})` }} /></div>
          <div className="profile-meta"><span>{supplierProfile.source === "onboarding" ? "Perfil salvo" : "Perfil de demonstração"}</span><strong>{profileCompletion}%</strong></div>
          <button type="button" onClick={() => setProfileOpen(true)}>Ver perfil</button>
        </div>
      </aside>

      <section className="workspace" id="top">
        <header className="topbar">
          <div><span className="eyebrow">{supplierProfile.targetMunicipality} · {supplierProfile.targetState}</span><h1>Oportunidades para {supplierProfile.companyName}.</h1></div>
          <div className="top-actions"><span className="snapshot"><i /> Snapshot público · 19 ago</span><button className="icon-button" type="button" aria-label="Abrir notificações">●</button></div>
        </header>

        <section className="summary-strip" aria-label="Resumo da inbox">
          <div><strong>{rankedOpportunities.length}</strong><span>oportunidades analisadas</span></div>
          <div><strong>{highMatchCount}</strong><span>boas opções para o perfil</span></div>
          <div><strong>{rankedOpportunities.filter((item) => item.alerts?.length).length}</strong><span>com ponto para revisar</span></div>
          <p><span aria-hidden="true">✓</span>{highMatchCount ? "Ordem calculada por atividade, região, enquadramento e riscos do edital." : "Nenhuma alta aderência agora; mantivemos as opções próximas para comparação."}</p>
        </section>

        <div className={`content-grid view-${viewMode}`} id="oportunidades">
          <section className="inbox" aria-labelledby="inbox-heading">
            <div className="section-heading">
              <div><span className="eyebrow">Oportunidades</span><h2 id="inbox-heading">{highFilterActive ? "Melhores para o seu perfil" : "Ordenadas por aderência"}</h2></div>
              <div className="inbox-controls">
                <div className="view-switcher" aria-label="Visualização das oportunidades">
                  <button type="button" aria-pressed={viewMode === "summary"} onClick={() => setViewMode("summary")}>Sumário</button>
                  <button type="button" aria-pressed={viewMode === "map"} onClick={() => setViewMode("map")}>Mapa</button>
                </div>
                <button className={`filter-button ${highFilterActive ? "filter-active" : ""}`} type="button" disabled={!highMatchCount} onClick={() => setOnlyHighMatch((value) => !value)}>
                  {!highMatchCount ? "Sem alta aderência" : highFilterActive ? "Mostrar todas" : "Mostrar melhores"} <span>{highFilterActive ? rankedOpportunities.length : highMatchCount}</span>
                </button>
              </div>
            </div>

            {viewMode === "map" ? (
              <OpportunityMap opportunities={visibleOpportunities.map((item) => ({ ...item, match: item.matchResult.score }))} selectedId={selected.id} companyName={supplierProfile.companyName} companyInitials={profileInitials} onSelect={chooseOpportunity} />
            ) : <div className="opportunity-list">
              {visibleOpportunities.map((opportunity) => (
                <div
                  className={`opportunity-card ${selected.id === opportunity.id ? "selected" : ""}`}
                  key={opportunity.id}
                  onClick={() => chooseOpportunity(opportunity.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      chooseOpportunity(opportunity.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="card-topline"><span className="activity">{opportunity.activity}</span><span className={`match ${opportunity.matchResult.score >= 88 ? "strong" : opportunity.matchResult.score >= 58 ? "medium" : "low"}`}>{opportunity.matchResult.label} · {opportunity.matchResult.score}%</span></div>
                  <h3>{opportunity.service}</h3>
                  <p>{opportunity.summary}</p>
                  <div className="card-context"><span>{opportunity.location}</span><span>Até {formatDeadline(opportunity.proposalDeadline)}</span></div>
                  <div className="tags">{opportunity.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}</div>
                  {opportunity.alerts?.length ? <div className="card-alert"><b>!</b> {opportunity.alerts[0]}</div> : null}
                  <div className="card-footer"><span>#{opportunity.id} · {opportunity.agency}</span><span className="card-link">Abrir <b>→</b></span></div>
                </div>
              ))}
            </div>}
          </section>

          <aside className={`detail-panel mode-${panelMode}`} aria-label="Painel da oportunidade selecionada">
            {panelMode === "detail" ? (
              <>
                <div className="detail-kicker"><span>Oportunidade selecionada</span><b>{selected.matchResult.label} · {selected.matchResult.score}%</b></div>
                <h2>{selected.service}</h2>
                <p className="detail-lead">{selected.description}</p>
                <div className="insight-box"><span aria-hidden="true">✓</span><div><strong>Por que está nesta posição</strong>{selected.matchResult.reasons.map((reason) => <p key={reason}>{reason}</p>)}{selected.matchResult.gaps.map((gap) => <p className="match-gap" key={gap}>A revisar: {gap}</p>)}</div></div>
                {selected.alerts?.map((alert) => <div className="quality-alert" key={alert}><b>Alerta</b><span>{alert}</span></div>)}
                <dl className="facts">
                  <div><dt>Local</dt><dd>{selected.location}</dd></div><div><dt>Pagamento</dt><dd>{selected.payment}</dd></div>
                  <div><dt>Propostas até</dt><dd>{formatDeadline(selected.proposalDeadline)}</dd></div><div><dt>Execução</dt><dd>{selected.executionDeadline}</dd></div>
                  <div><dt>Anexos</dt><dd>{selected.attachments ? `${selected.attachments} arquivo${selected.attachments > 1 ? "s" : ""}` : "Nenhum"}</dd></div><div><dt>Perfil</dt><dd>Apenas MEI</dd></div>
                </dl>
                <div className="checklist"><div className="checklist-heading"><span>Antes de aplicar</span><b>2 confirmações</b></div><p><i>✓</i> Localização e atividade compatíveis</p><p><i>?</i> Confirmar disponibilidade para vistoria</p><p><i>?</i> Confirmar materiais no orçamento</p></div>
                <button className="primary-action" type="button" onClick={startConversation}><span aria-hidden="true">◎</span> Conversar sobre esta oportunidade</button>
                <small className="safety-note">Você revisa tudo antes de enviar uma proposta.</small>
              </>
            ) : null}

            {panelMode === "conversation" ? (
              <section className="conversation-panel" aria-live="polite">
                <button className="back-button" type="button" onClick={() => setPanelMode("detail")}>← Voltar ao detalhe</button>
                <div className="conversation-heading"><span className="conversation-status"><i /> Conversa guiada</span><span>{Math.min(conversationStep + 1, 2)} de 2</span></div>
                <h2>Vamos confirmar se esta oportunidade cabe na sua rotina.</h2>
                <div className="conversation-context"><span>{selected.matchResult.score}% de aderência</span><div><small>Oportunidade #{selected.id}</small><strong>{selected.service}</strong></div></div>
                <div className="conversation-progress" aria-label={`${conversationStep} de 2 respostas confirmadas`}><span className={conversationStep >= 1 ? "complete" : "active"} /><span className={conversationStep >= 2 ? "complete" : conversationStep === 1 ? "active" : ""} /></div>
                <div className="chat-thread">
                  <div className="assistant-message"><b>Agente Primeiro Contrato</b><p>Comparei o edital com o perfil de {supplierProfile.companyName}. Preciso confirmar dois pontos práticos antes de preparar o rascunho.</p></div>
                  <div className="assistant-message"><b>Disponibilidade</b><p>Você consegue fazer a vistoria e as medições antes de enviar o orçamento?</p></div>
                  {conversationStep === 0 ? <div className="answer-options"><button type="button" onClick={() => { setConversationAnswers({ visit: "Consigo fazer a vistoria" }); setConversationStep(1); }}>Sim, consigo</button><button type="button" onClick={() => { setConversationAnswers({ visit: "Preciso combinar a data" }); setConversationStep(1); }}>Preciso agendar</button></div> : <div className="user-message">{conversationAnswers.visit}</div>}
                  {conversationStep >= 1 ? <div className="assistant-message message-enter"><b>Composição do preço</b><p>Seu orçamento pode incluir materiais, transporte e limpeza final?</p></div> : null}
                  {conversationStep === 1 ? <div className="answer-options message-enter"><button type="button" onClick={() => { setConversationAnswers((current) => ({ ...current, materials: "Vou incluir todos os custos" })); setConversationStep(2); }}>Sim, incluo tudo</button><button type="button" onClick={() => { setConversationAnswers((current) => ({ ...current, materials: "Preciso calcular os materiais" })); setConversationStep(2); }}>Quero calcular primeiro</button></div> : null}
                  {conversationStep >= 2 ? <><div className="user-message message-enter">{conversationAnswers.materials}</div><div className="assistant-message ready-message message-enter"><b>Confirmações registradas</b><p>O perfil continua compatível. Organizei estas respostas no rascunho, que ainda ficará disponível para sua revisão.</p><dl><div><dt>Vistoria</dt><dd>{conversationAnswers.visit}</dd></div><div><dt>Custos</dt><dd>{conversationAnswers.materials}</dd></div></dl><button type="button" onClick={() => { setConversationStep(0); setConversationAnswers({}); }}>Alterar respostas</button></div></> : null}
                </div>
                {conversationStep >= 2 ? <button className="primary-action" type="button" onClick={() => setPanelMode("application")}>Preparar aplicação <span>→</span></button> : null}
              </section>
            ) : null}

            {panelMode === "application" ? (
              <section className="application-panel">
                <button className="back-button" type="button" onClick={() => setPanelMode("detail")}>← Voltar ao detalhe</button>
                <span className="conversation-status"><i /> Rascunho da aplicação</span>
                <h2>{draftReady ? "Tudo pronto para sua revisão." : "Pré-preenchimento preparado."}</h2>
                <p className="detail-lead">Os dados confirmados foram organizados para sua revisão. Nenhuma proposta será enviada por esta demonstração.</p>
                <div className="application-sheet">
                  <div>Empresa<span>{supplierProfile.companyName} · {supplierProfile.isMei === true ? "MEI" : "Enquadramento a confirmar"}</span></div>
                  <div>Oportunidade<span>#{selected.id} · {selected.service}</span></div>
                  <div>Local de execução<span>{selected.location}</span></div>
                  <div>Escopo proposto<span>Mão de obra, materiais, transporte e limpeza final</span></div>
                  <div>Prazo assumido<span>{selected.executionDeadline}</span></div>
                </div>
                <div className="automation-note"><span>▤</span><div><b>Edital pré-preenchido</b><p>Empresa, oportunidade, escopo e prazos reunidos em um único rascunho revisável.</p></div></div>
                <button className="primary-action" type="button" onClick={() => setDraftReady(true)}>{draftReady ? "Rascunho revisado ✓" : "Revisar dados da aplicação"}</button>
              </section>
            ) : null}
          </aside>
        </div>
      </section>

      {profileOpen ? (
        <div className="modal-backdrop">
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <button className="modal-close" type="button" aria-label="Fechar perfil" onClick={() => setProfileOpen(false)}>×</button>
            <span className="eyebrow">Perfil da empresa</span><h2 id="profile-title">{supplierProfile.companyName}</h2><p>Dados usados para ordenar as oportunidades desta sessão.</p>
            <div className="profile-fields"><div>Razão social<span>{supplierProfile.legalName}</span></div><div>CNPJ<span>{supplierProfile.cnpj}</span></div><div>Região prioritária<span>{supplierProfile.targetMunicipality}/{supplierProfile.targetState} · raio de {supplierProfile.operatingRadiusKm} km</span></div><div>Enquadramento<span>{supplierProfile.isMei === true ? "MEI" : "A confirmar"}{supplierProfile.isSimple === true ? " · Simples Nacional" : ""}</span></div><div>Atividade principal<span>{supplierProfile.mainActivity}</span></div><div>Limite por contrato<span>{formatCurrency(supplierProfile.contractLimit)}</span></div><div>Capacidades reconhecidas<span>{supplierProfile.capabilities.length ? supplierProfile.capabilities.join(", ") : "Nenhuma capacidade específica confirmada"}</span></div></div>
            <div className="document-row"><span>✓</span><div><b>{supplierProfile.source === "onboarding" ? "Perfil salvo neste navegador" : "Perfil da demonstração"}</b><small>O ranking é recalculado quando estes dados mudam</small></div></div>
            <button className="primary-action" type="button" onClick={() => setProfileOpen(false)}>Fechar perfil</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
