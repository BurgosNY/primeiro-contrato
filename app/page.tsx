"use client";

import { useMemo, useState } from "react";

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

export default function Home() {
  const [selectedId, setSelectedId] = useState("12908");
  const [onlyHighMatch, setOnlyHighMatch] = useState(false);
  const [panelMode, setPanelMode] = useState<"detail" | "conversation" | "application">("detail");
  const [conversationStep, setConversationStep] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const selected = opportunities.find((item) => item.id === selectedId) ?? opportunities[0];
  const visibleOpportunities = useMemo(
    () => opportunities.filter((item) => !onlyHighMatch || item.match >= 85),
    [onlyHighMatch],
  );

  const chooseOpportunity = (id: string) => {
    setSelectedId(id);
    setPanelMode("detail");
    setConversationStep(0);
    setDraftReady(false);
  };

  const startConversation = () => {
    setPanelMode("conversation");
    setConversationStep(0);
  };

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Primeiro Contrato — início">
          <span className="brand-mark">1º</span><span>Primeiro Contrato</span>
        </a>
        <nav className="nav" aria-label="Navegação principal">
          <button className="nav-item active" type="button" onClick={() => setPanelMode("detail")}><span aria-hidden="true">◫</span> Oportunidades <b>12</b></button>
          <button className="nav-item" type="button" onClick={startConversation}><span aria-hidden="true">◎</span> Conversa guiada</button>
          <button className="nav-item" type="button" onClick={() => setPanelMode("application")}><span aria-hidden="true">✓</span> Aplicação <b>1</b></button>
        </nav>
        <div className="profile-card">
          <div className="profile-row"><span className="avatar">JM</span><span><strong>JM Reparos</strong><small>Perfil de demonstração</small></span></div>
          <div className="profile-progress"><span /></div>
          <div className="profile-meta"><span>Perfil completo</span><strong>78%</strong></div>
          <button type="button" onClick={() => setProfileOpen(true)}>Completar perfil</button>
        </div>
      </aside>

      <section className="workspace" id="top">
        <header className="topbar">
          <div><span className="eyebrow">Itapoá · Santa Catarina</span><h1>Boas oportunidades encontraram você.</h1></div>
          <div className="top-actions"><span className="snapshot"><i /> Snapshot público · 19 ago</span><button className="icon-button" type="button" aria-label="Abrir notificações">●</button></div>
        </header>

        <section className="summary-strip" aria-label="Resumo da inbox">
          <div><strong>12</strong><span>oportunidades no snapshot</span></div>
          <div><strong>5</strong><span>com alerta de qualidade</span></div>
          <div><strong>30</strong><span>fotos ou anexos encontrados</span></div>
          <p><span aria-hidden="true">✦</span> A análise considera serviços, localização, capacidade e riscos antes de recomendar.</p>
        </section>

        <div className="content-grid" id="oportunidades">
          <section className="inbox" aria-labelledby="inbox-heading">
            <div className="section-heading">
              <div><span className="eyebrow">Sua inbox</span><h2 id="inbox-heading">{onlyHighMatch ? "Alta compatibilidade" : "Todas as oportunidades"}</h2></div>
              <button className={`filter-button ${onlyHighMatch ? "filter-active" : ""}`} type="button" onClick={() => setOnlyHighMatch((value) => !value)}>
                {onlyHighMatch ? "Mostrar todas" : "Só alta compatibilidade"} <span>{onlyHighMatch ? "12" : "5"}</span>
              </button>
            </div>

            <div className="opportunity-list">
              {visibleOpportunities.map((opportunity) => (
                <article className={`opportunity-card ${selected.id === opportunity.id ? "selected" : ""}`} key={opportunity.id} onClick={() => chooseOpportunity(opportunity.id)}>
                  <div className="card-topline"><span className="activity">{opportunity.activity}</span><span className={`match ${opportunity.match >= 85 ? "strong" : opportunity.match >= 70 ? "medium" : "low"}`}>{opportunity.match}% compatível</span></div>
                  <h3>{opportunity.service}</h3>
                  <p>{opportunity.summary}</p>
                  <div className="tags">{opportunity.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  {opportunity.alerts?.length ? <div className="card-alert"><b>!</b> {opportunity.alerts[0]}</div> : null}
                  <div className="card-footer"><span>Prazo: {formatDeadline(opportunity.proposalDeadline)} · #{opportunity.id}</span><button type="button" onClick={(event) => { event.stopPropagation(); chooseOpportunity(opportunity.id); }}>Ver oportunidade <b>→</b></button></div>
                </article>
              ))}
            </div>
          </section>

          <aside className={`detail-panel mode-${panelMode}`} aria-label="Painel da oportunidade selecionada">
            {panelMode === "detail" ? (
              <>
                <div className="detail-kicker"><span>Oportunidade selecionada</span><b>{selected.match}%</b></div>
                <h2>{selected.service}</h2>
                <p className="detail-lead">{selected.description}</p>
                <div className="insight-box"><span aria-hidden="true">✦</span><div><strong>Por que combina</strong><p>Você atende Itapoá e informou experiência compatível. A IA ainda vai confirmar os detalhes que faltam.</p></div></div>
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
                <span className="conversation-status"><i /> Conversa guiada</span>
                <h2>Vamos deixar sua proposta pronta.</h2>
                <div className="chat-thread">
                  <div className="assistant-message"><b>Primeiro Contrato</b><p>Li a oportunidade #{selected.id}. Já validei seu perfil e preciso confirmar só duas informações.</p></div>
                  <div className="assistant-message"><b>1 de 2</b><p>Você consegue fazer a vistoria e as medições antes de enviar o orçamento?</p></div>
                  {conversationStep === 0 ? <div className="answer-options"><button type="button" onClick={() => setConversationStep(1)}>Sim, consigo</button><button type="button" onClick={() => setConversationStep(1)}>Preciso agendar</button></div> : <div className="user-message">Sim, consigo fazer a vistoria.</div>}
                  {conversationStep >= 1 ? <div className="assistant-message"><b>2 de 2</b><p>Seu preço pode incluir materiais, transporte e limpeza final?</p></div> : null}
                  {conversationStep === 1 ? <div className="answer-options"><button type="button" onClick={() => setConversationStep(2)}>Sim, incluo tudo</button><button type="button" onClick={() => setConversationStep(2)}>Quero calcular primeiro</button></div> : null}
                  {conversationStep >= 2 ? <><div className="user-message">Sim, vou incluir todos os custos.</div><div className="assistant-message ready-message"><b>Pronto para avançar</b><p>Seu perfil atende aos requisitos principais. Preparei um resumo para o formulário do Contrata+Brasil.</p></div></> : null}
                </div>
                {conversationStep >= 2 ? <button className="primary-action" type="button" onClick={() => setPanelMode("application")}>Preparar aplicação <span>→</span></button> : null}
              </section>
            ) : null}

            {panelMode === "application" ? (
              <section className="application-panel">
                <button className="back-button" type="button" onClick={() => setPanelMode("detail")}>← Voltar ao detalhe</button>
                <span className="conversation-status"><i /> Rascunho da aplicação</span>
                <h2>{draftReady ? "Tudo pronto para sua revisão." : "Pré-preenchimento preparado."}</h2>
                <p className="detail-lead">A IA organizou os dados que serão levados ao portal. Nenhuma proposta será enviada sem sua confirmação.</p>
                <div className="application-sheet">
                  <label>Empresa<span>JM Reparos · MEI</span></label>
                  <label>Oportunidade<span>#{selected.id} · {selected.service}</span></label>
                  <label>Local de execução<span>{selected.location}</span></label>
                  <label>Escopo proposto<span>Mão de obra, materiais, transporte e limpeza final</span></label>
                  <label>Prazo assumido<span>{selected.executionDeadline}</span></label>
                </div>
                <div className="automation-note"><span>↗</span><div><b>Próxima etapa: computer use</b><p>A IA abre o portal, preenche o formulário e para antes do envio.</p></div></div>
                <button className="primary-action" type="button" onClick={() => setDraftReady(true)}>{draftReady ? "Rascunho revisado ✓" : "Revisar dados da aplicação"}</button>
              </section>
            ) : null}
          </aside>
        </div>
      </section>

      {profileOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setProfileOpen(false)}>
          <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" aria-label="Fechar perfil" onClick={() => setProfileOpen(false)}>×</button>
            <span className="eyebrow">Perfil da empresa</span><h2 id="profile-title">JM Reparos</h2><p>Essas informações ajudam a IA a recomendar só o que sua empresa consegue executar.</p>
            <div className="profile-fields"><label>Cidade de atendimento<span>Itapoá e região · raio de 40 km</span></label><label>Enquadramento<span>MEI · situação ativa</span></label><label>Serviços principais<span>Manutenção predial, elétrica e pequenos reparos</span></label><label>Capacidade<span>Equipe de 2 pessoas · veículo próprio</span></label></div>
            <div className="document-row"><span>✓</span><div><b>Cartão CNPJ</b><small>Dados extraídos e verificados</small></div></div>
            <div className="document-row pending"><span>+</span><div><b>Adicionar certificados</b><small>NR-10, NR-35 ou comprovantes técnicos</small></div></div>
            <button className="primary-action" type="button" onClick={() => setProfileOpen(false)}>Salvar perfil</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
