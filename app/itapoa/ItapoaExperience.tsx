"use client";

import { useEffect, useMemo, useState } from "react";
import { readSupplierProfile } from "@/lib/demo-profile";
import { providerProfileFromOnboarding } from "@/lib/profile-bridge";
import type {
  CapabilityId,
  MatchApiResponse,
  MatchResult,
  OpportunitySnapshot,
  PersistedState,
  ProviderProfile,
  PublicOpportunity,
  SkillId,
  SkillLevel,
} from "./domain";
import {
  capabilityCatalog,
  editableProfileSkillIds,
  levelLabels,
  skillCatalog,
} from "./profile";
import { OpportunityMap } from "./OpportunityMap";

type Props = {
  snapshot: OpportunitySnapshot;
  initialProfile: ProviderProfile;
  initialMatches: MatchApiResponse;
};

const formatDeadline = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value)).replace(".", "");

const formatSnapshot = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));

const cleanSummary = (opportunity: PublicOpportunity) => {
  const text = opportunity.summaryFromListing || opportunity.description;
  return text.length > 180 ? `${text.slice(0, 177).trim()}…` : text;
};

const locationLabel = (opportunity: PublicOpportunity) =>
  [opportunity.executionLocation.neighborhood, opportunity.executionLocation.city]
    .filter(Boolean)
    .join(" · ");

const matchClass = (match: MatchResult) => {
  if (match.blocked) return "blocked";
  if (match.band === "recommended") return "strong";
  if (match.band === "review") return "medium";
  return "low";
};

const matchLabel = (match: MatchResult) => {
  if (match.blocked) return `${match.score}% · impedida`;
  if (match.band === "recommended") return `${match.score}% compatível`;
  if (match.band === "review") return `${match.score}% · revisar`;
  return `${match.score}% · fora do perfil`;
};

const paymentLabel = (opportunity: PublicOpportunity) =>
  [opportunity.payment.method, opportunity.payment.term].filter(Boolean).join(" · ") || "Não informado";

export function ItapoaExperience({ snapshot: initialSnapshot, initialProfile, initialMatches }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [profile, setProfile] = useState(initialProfile);
  const [draftProfile, setDraftProfile] = useState(initialProfile);
  const [matchResponse, setMatchResponse] = useState(initialMatches);
  const [selectedId, setSelectedId] = useState(initialMatches.matches[0]?.opportunityId ?? snapshot.opportunities[0].opportunityId);
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [viewMode, setViewMode] = useState<"summary" | "map">("summary");
  const [panelMode, setPanelMode] = useState<"detail" | "conversation" | "application">("detail");
  const [conversationStep, setConversationStep] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<PersistedState["lastRefresh"]>({ status: "seeded", source: "committed_snapshot", capturedAt: initialSnapshot.snapshot.capturedAt, opportunityCount: initialSnapshot.opportunities.length, requirementsCount: 0, model: null });

  const applyState = (state: PersistedState) => {
    setSnapshot(state.snapshot); setProfile(state.profile); setDraftProfile(state.profile); setMatchResponse(state.matches); setLastRefresh(state.lastRefresh);
    const next = state.matches.matches.find((item) => item.band === "recommended") ?? state.matches.matches[0];
    if (next) setSelectedId(next.opportunityId);
  };

  useEffect(() => {
    let active = true;
    const loadState = async () => {
      try {
        const response = await fetch("/api/itapoa/state", { cache: "no-store" });
        if (!response.ok) throw new Error("Não foi possível carregar os dados persistidos.");
        let state = await response.json() as PersistedState;

        const onboardingProfile = readSupplierProfile();
        if (onboardingProfile.source === "onboarding" && onboardingProfile.updatedAt !== state.profile.updatedAt) {
          const profileResponse = await fetch("/api/itapoa/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile: providerProfileFromOnboarding(onboardingProfile, state.profile) }),
          });
          if (profileResponse.ok) state = await profileResponse.json() as PersistedState;
        }

        if (active) applyState(state);
      } catch (error) {
        if (active) setRefreshMessage(error instanceof Error ? error.message : "Falha ao carregar o banco.");
      }
    };
    void loadState();
    return () => { active = false; };
  }, []);

  const opportunityById = useMemo(
    () => new Map(snapshot.opportunities.map((item) => [item.opportunityId, item])),
    [snapshot.opportunities],
  );
  const matchById = useMemo(
    () => new Map(matchResponse.matches.map((item) => [item.opportunityId, item])),
    [matchResponse.matches],
  );
  const rankedOpportunities = useMemo(
    () => matchResponse.matches
      .map((match) => opportunityById.get(match.opportunityId))
      .filter((item): item is PublicOpportunity => Boolean(item)),
    [matchResponse.matches, opportunityById],
  );
  const visibleOpportunities = useMemo(
    () => rankedOpportunities.filter((item) => !onlyRecommended || matchById.get(item.opportunityId)?.band === "recommended"),
    [matchById, onlyRecommended, rankedOpportunities],
  );

  const selected = opportunityById.get(selectedId) ?? rankedOpportunities[0];
  const selectedMatch = matchById.get(selected.opportunityId) ?? matchResponse.matches[0];
  const recommendedCount = matchResponse.matches.filter((match) => match.band === "recommended").length;
  const blockedCount = matchResponse.matches.filter((match) => match.blocked).length;
  const attachmentCount = snapshot.opportunities.reduce((sum, opportunity) => sum + opportunity.attachments.length, 0);
  const canAdvance = selectedMatch.band === "recommended" && !selectedMatch.blocked;
  const profileCompletion = profile.skills.length >= 3 && profile.capabilities.length >= 4 ? 100 : 80;
  const profileInitials = profile.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PC";

  const chooseOpportunity = (id: string) => {
    setSelectedId(id);
    setPanelMode("detail");
    setConversationStep(0);
    setDraftReady(false);
  };

  const openProfile = () => {
    setDraftProfile(profile);
    setProfileError(null);
    setProfileOpen(true);
  };

  const startConversation = () => {
    if (!canAdvance) {
      openProfile();
      return;
    }
    setPanelMode("conversation");
    setConversationStep(0);
  };

  const toggleSkill = (skillId: SkillId, checked: boolean) => {
    setDraftProfile((current) => {
      const skills = checked
        ? [...current.skills, { id: skillId, level: "experienced" as const, evidence: "self_declared" as const }]
        : current.skills.filter((skill) => skill.id !== skillId);
      return {
        ...current,
        skills,
        exclusions: checked
          ? current.exclusions.filter((id) => id !== skillId)
          : Array.from(new Set([...current.exclusions, skillId])),
      };
    });
  };

  const changeSkillLevel = (skillId: SkillId, level: SkillLevel) => {
    setDraftProfile((current) => ({
      ...current,
      skills: current.skills.map((skill) => skill.id === skillId ? { ...skill, level } : skill),
    }));
  };

  const toggleCapability = (capabilityId: CapabilityId, checked: boolean) => {
    setDraftProfile((current) => ({
      ...current,
      capabilities: checked
        ? Array.from(new Set([...current.capabilities, capabilityId]))
        : current.capabilities.filter((id) => id !== capabilityId),
    }));
  };

  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileError(null);
    const nextProfile: ProviderProfile = { ...draftProfile, updatedAt: new Date().toISOString() };

    try {
      const response = await fetch("/api/itapoa/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: nextProfile }),
      });
      if (!response.ok) throw new Error("Não foi possível recalcular os matches.");
      const result = await response.json() as PersistedState;
      applyState(result);
      setPanelMode("detail");
      setProfileOpen(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Falha ao atualizar o perfil.");
    } finally {
      setProfileSaving(false);
    }
  };

  const refreshOpportunities = async () => {
    setRefreshing(true); setRefreshMessage(null);
    try {
      const response = await fetch("/api/itapoa/refresh", { method: "POST" });
      const result = await response.json() as PersistedState | { error: string; state?: PersistedState };
      if (!response.ok) {
        if ("state" in result && result.state) applyState(result.state);
        throw new Error("error" in result ? result.error : "Falha ao atualizar oportunidades.");
      }
      applyState(result as PersistedState); setRefreshMessage("Oportunidades ao vivo atualizadas e comparadas com seu perfil.");
    } catch (error) { setRefreshMessage(error instanceof Error ? error.message : "Falha ao atualizar oportunidades."); }
    finally { setRefreshing(false); }
  };

  const selectedSkillLabels = profile.skills.map((skill) => skillCatalog[skill.id].shortLabel);
  const currentVisitQuestion = selectedMatch.requiredCapabilities.includes("technical_visit")
    ? "Você consegue fazer a vistoria e as medições antes de enviar o orçamento?"
    : "Você consegue confirmar o escopo e o local antes de enviar o orçamento?";
  const currentCostQuestion = selectedMatch.requiredCapabilities.includes("materials_supply")
    ? "Seu preço pode incluir materiais, transporte e limpeza previstos no escopo?"
    : "Seu preço pode incluir todos os custos de execução e deslocamento?";

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Primeiro Contrato — início">
          <span className="brand-mark">1º</span><span>Primeiro Contrato</span>
        </a>
        <nav className="nav" aria-label="Navegação principal">
          <button className="nav-item active" type="button" onClick={() => setPanelMode("detail")}><span aria-hidden="true">◫</span> Oportunidades <b>{snapshot.opportunities.length}</b></button>
          <button className="nav-item" type="button" onClick={startConversation}><span aria-hidden="true">◎</span> Conversa guiada</button>
          <button className="nav-item" type="button" disabled={!canAdvance} onClick={() => setPanelMode("application")}><span aria-hidden="true">✓</span> Aplicação <b>{canAdvance ? "1" : "0"}</b></button>
        </nav>
        <div className="profile-card">
          <div className="profile-row"><span className="avatar">JM</span><span><strong>{profile.displayName}</strong><small>Perfil simulado · dados declarados</small></span></div>
          <div className="profile-progress"><span style={{ width: `${profileCompletion}%` }} /></div>
          <div className="profile-meta"><span>Perfil pronto para match</span><strong>{profileCompletion}%</strong></div>
          <button type="button" onClick={openProfile}>Ajustar perfil e recalcular</button>
        </div>
      </aside>

      <section className="workspace" id="top">
        <header className="topbar">
          <div><span className="eyebrow">Itapoá · Santa Catarina</span><h1>{recommendedCount} oportunidades combinam com o perfil.</h1></div>
          <div className="top-actions">
            <button className="snapshot refresh-opportunities" type="button" onClick={refreshOpportunities} disabled={refreshing}><i /> {refreshing ? "Coletando e analisando…" : "Atualizar oportunidades"}</button>
            <small className="snapshot-meta">{lastRefresh.source === "live_contrata_brasil" ? "Atualização ao vivo" : "Snapshot público"} · {formatSnapshot(lastRefresh.capturedAt)}</small>
            {refreshMessage ? <span className="refresh-message" role="status">{refreshMessage}</span> : null}
          </div>
        </header>

        <section className="summary-strip" aria-label="Resumo do matching">
          <div><strong>{recommendedCount}</strong><span>recomendadas pelo perfil</span></div>
          <div><strong>{blockedCount}</strong><span>com impedimento detectado</span></div>
          <div><strong>{attachmentCount}</strong><span>fotos ou anexos validados</span></div>
          <p><span aria-hidden="true">✦</span> A IA extrai os requisitos de cada edital; a pontuação auditável compara esses requisitos com o perfil salvo. Alertas não são escondidos pelo score.</p>
        </section>

        <div className="profile-evidence-bar" aria-label="Perfil usado no cálculo">
          <div><span>Perfil usado no cálculo</span><strong>{profile.displayName} · MEI ativo · equipe de {profile.teamSize}</strong></div>
          <p>{selectedSkillLabels.join(" · ")}</p>
          <button type="button" onClick={openProfile}>Editar perfil</button>
        </div>

        <div className={`content-grid view-${viewMode}`} id="oportunidades">
          <section className="inbox" aria-labelledby="inbox-heading">
            <div className="section-heading">
              <div><span className="eyebrow">Ranking calculado</span><h2 id="inbox-heading">{onlyRecommended ? "Recomendadas agora" : "Todas as oportunidades"}</h2></div>
              <div className="inbox-controls">
                <div className="view-switcher" aria-label="Visualização das oportunidades">
                  <button type="button" aria-pressed={viewMode === "summary"} onClick={() => setViewMode("summary")}>Sumário</button>
                  <button type="button" aria-pressed={viewMode === "map"} onClick={() => setViewMode("map")}>Mapa</button>
                </div>
                <button className={`filter-button ${onlyRecommended ? "filter-active" : ""}`} type="button" onClick={() => setOnlyRecommended((value) => !value)}>
                  {onlyRecommended ? "Mostrar todas" : "Só recomendadas"} <span>{onlyRecommended ? snapshot.opportunities.length : recommendedCount}</span>
                </button>
              </div>
            </div>

            {viewMode === "map" ? (
              <OpportunityMap
                opportunities={visibleOpportunities.map((opportunity) => ({
                  id: opportunity.opportunityId,
                  service: opportunity.serviceName,
                  activity: opportunity.activity,
                  location: locationLabel(opportunity),
                  match: matchById.get(opportunity.opportunityId)?.score ?? 0,
                }))}
                selectedId={selected.opportunityId}
                companyName={profile.displayName}
                companyInitials={profileInitials}
                radiusKm={profile.baseLocation.serviceRadiusKm}
                onSelect={chooseOpportunity}
              />
            ) : <div className="opportunity-list">
              {visibleOpportunities.map((opportunity) => {
                const match = matchById.get(opportunity.opportunityId) as MatchResult;
                const alert = opportunity.qualityFlags.find((flag) => flag.severity === "critical");
                return (
                  <div
                    className={`opportunity-card ${selected.opportunityId === opportunity.opportunityId ? "selected" : ""}`}
                    key={opportunity.opportunityId}
                    onClick={() => chooseOpportunity(opportunity.opportunityId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        chooseOpportunity(opportunity.opportunityId);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="card-topline"><span className="activity">{opportunity.activity}</span><span className={`match ${matchClass(match)}`}>{matchLabel(match)}</span></div>
                    <h3>{opportunity.serviceName}</h3>
                    <p>{cleanSummary(opportunity)}</p>
                    <div className="tags">
                      {opportunity.onlyMei ? <span>Apenas MEI</span> : null}
                      <span>{locationLabel(opportunity)}</span>
                      <span>{opportunity.attachments.length} anexo{opportunity.attachments.length === 1 ? "" : "s"}</span>
                    </div>
                    {alert ? <div className="card-alert"><b>!</b> {alert.evidence}</div> : null}
                    <div className="card-footer"><span>Prazo: {formatDeadline(opportunity.proposalClosesAt)} · #{opportunity.opportunityId}</span><span className="card-link">Ver análise <b>→</b></span></div>
                  </div>
                );
              })}
            </div>}
          </section>

          <aside className={`detail-panel mode-${panelMode}`} aria-label="Painel da oportunidade selecionada">
            {panelMode === "detail" ? (
              <>
                <div className="detail-kicker"><span>Análise de compatibilidade</span><b className={matchClass(selectedMatch)}>{selectedMatch.score}%</b></div>
                <h2>{selected.serviceName}</h2>
                <p className="detail-lead">{selected.description}</p>

                <div className="match-breakdown" aria-label="Composição da pontuação">
                  <div><span>Perfil e local</span><b>{selectedMatch.breakdown.legalAndLocation}/25</b></div>
                  <div><span>Técnica</span><b>{selectedMatch.breakdown.technical}/55</b></div>
                  <div><span>Operação</span><b>{selectedMatch.breakdown.operational}/15</b></div>
                  <div><span>Evidências</span><b>{selectedMatch.breakdown.evidence}/5</b></div>
                </div>

                <div className="insight-box"><span aria-hidden="true">✦</span><div><strong>Por que {selectedMatch.band === "recommended" ? "recomendamos" : "precisa de revisão"}</strong><p>{selectedMatch.reasons.slice(0, 3).join(". ") || "O perfil não apresentou evidência suficiente para este serviço."}.</p></div></div>
                {selectedMatch.blockers.map((blocker) => <div className="quality-alert" key={blocker}><b>Impedimento</b><span>{blocker}</span></div>)}

                <dl className="facts">
                  <div><dt>Local</dt><dd>{locationLabel(selected)}</dd></div><div><dt>Órgão</dt><dd>{selected.requestingAgency}</dd></div>
                  <div><dt>Pagamento</dt><dd>{paymentLabel(selected)}</dd></div><div><dt>Propostas até</dt><dd>{formatDeadline(selected.proposalClosesAt)}</dd></div>
                  <div><dt>Execução publicada</dt><dd>{selected.executionDeadlineRaw}</dd></div><div><dt>Anexos</dt><dd>{selected.attachments.length}</dd></div>
                </dl>

                <div className="checklist">
                  <div className="checklist-heading"><span>Leitura do perfil</span><b>{selectedMatch.gaps.length + selectedMatch.blockers.length} pendência{selectedMatch.gaps.length + selectedMatch.blockers.length === 1 ? "" : "s"}</b></div>
                  {selectedMatch.reasons.slice(0, 3).map((reason) => <p key={reason}><i>✓</i> {reason}</p>)}
                  {selectedMatch.gaps.slice(0, 3).map((gap) => <p key={gap}><i>?</i> {gap}</p>)}
                  {selectedMatch.blockers.slice(0, 2).map((blocker) => <p className="blocked-check" key={blocker}><i>!</i> {blocker}</p>)}
                </div>

                {canAdvance ? (
                  <button className="primary-action" type="button" onClick={startConversation}><span aria-hidden="true">◎</span> Validar detalhes desta oportunidade</button>
                ) : (
                  <button className="primary-action secondary-action" type="button" onClick={openProfile}>Ver o que falta no perfil</button>
                )}
                <a className="source-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte no Contrata+Brasil ↗</a>
              </>
            ) : null}

            {panelMode === "conversation" ? (
              <section className="conversation-panel" aria-live="polite">
                <button className="back-button" type="button" onClick={() => setPanelMode("detail")}>← Voltar à análise</button>
                <span className="conversation-status"><i /> Validação do match</span>
                <h2>Confirme o que não vem do perfil.</h2>
                <div className="chat-thread">
                  <div className="assistant-message"><b>Primeiro Contrato</b><p>O score de {selectedMatch.score}% veio do perfil e dos requisitos da oportunidade #{selected.opportunityId}. Restam duas confirmações específicas deste trabalho.</p></div>
                  <div className="assistant-message"><b>1 de 2</b><p>{currentVisitQuestion}</p></div>
                  {conversationStep === 0 ? <div className="answer-options"><button type="button" onClick={() => setConversationStep(1)}>Sim, consigo</button><button type="button" onClick={() => setConversationStep(1)}>Preciso agendar</button></div> : <div className="user-message">Sim, consigo confirmar no local.</div>}
                  {conversationStep >= 1 ? <div className="assistant-message"><b>2 de 2</b><p>{currentCostQuestion}</p></div> : null}
                  {conversationStep === 1 ? <div className="answer-options"><button type="button" onClick={() => setConversationStep(2)}>Sim, incluo tudo</button><button type="button" onClick={() => setConversationStep(2)}>Quero calcular primeiro</button></div> : null}
                  {conversationStep >= 2 ? <><div className="user-message">Sim, vou incluir todos os custos.</div><div className="assistant-message ready-message"><b>Match validado</b><p>O perfil cobre o serviço e você confirmou as condições específicas desta oportunidade. O rascunho pode ser preparado.</p></div></> : null}
                </div>
                {conversationStep >= 2 ? <button className="primary-action" type="button" onClick={() => setPanelMode("application")}>Preparar aplicação <span>→</span></button> : null}
              </section>
            ) : null}

            {panelMode === "application" ? (
              <section className="application-panel">
                <button className="back-button" type="button" onClick={() => setPanelMode("detail")}>← Voltar à análise</button>
                <span className="conversation-status"><i /> Rascunho da aplicação</span>
                <h2>{draftReady ? "Tudo pronto para sua revisão." : "Pré-preenchimento preparado."}</h2>
                <p className="detail-lead">Os dados abaixo vêm do perfil e da oportunidade. Nenhuma proposta será enviada sem confirmação.</p>
                <div className="application-sheet">
                  <div>Empresa<span>{profile.displayName} · {profile.legal.type}</span></div>
                  <div>Oportunidade<span>#{selected.opportunityId} · {selected.serviceName}</span></div>
                  <div>Compatibilidade calculada<span>{selectedMatch.score}% · modelo {matchResponse.scoringVersion}</span></div>
                  <div>Local de execução<span>{locationLabel(selected)}</span></div>
                  <div>Competências usadas<span>{selectedMatch.requiredSkills.filter((id) => profile.skills.some((skill) => skill.id === id)).map((id) => skillCatalog[id].shortLabel).join(", ")}</span></div>
                  <div>Prazo publicado<span>{selected.executionDeadlineRaw}</span></div>
                </div>
                <button className="primary-action" type="button" onClick={() => setDraftReady(true)}>{draftReady ? "Rascunho revisado ✓" : "Revisar dados da aplicação"}</button>
              </section>
            ) : null}
          </aside>
        </div>
      </section>

      {profileOpen ? (
        <div className="modal-backdrop">
          <section className="profile-modal profile-editor" role="dialog" aria-modal="true" aria-labelledby="profile-title">
            <button className="modal-close" type="button" aria-label="Fechar perfil" onClick={() => setProfileOpen(false)}>×</button>
            <span className="eyebrow">Perfil usado pelo motor de match</span><h2 id="profile-title">{draftProfile.displayName}</h2>
            <p>Este é um perfil simulado para a demo. Os serviços abaixo são declarações do prestador, não certificados verificados.</p>

            <div className="profile-fields editable-fields">
              <label>Empresa<input value={draftProfile.displayName} onChange={(event) => setDraftProfile((current) => ({ ...current, displayName: event.target.value }))} /></label>
              <label>Responsável<input value={draftProfile.ownerName} onChange={(event) => setDraftProfile((current) => ({ ...current, ownerName: event.target.value }))} /></label>
              <div>Enquadramento<span>MEI · situação ativa</span></div>
              <label>Cidade<input value={draftProfile.baseLocation.city} onChange={(event) => setDraftProfile((current) => ({ ...current, baseLocation: { ...current.baseLocation, city: event.target.value } }))} /></label>
              <label>Raio de atendimento (km)<input type="number" min="1" max="500" value={draftProfile.baseLocation.serviceRadiusKm} onChange={(event) => setDraftProfile((current) => ({ ...current, baseLocation: { ...current.baseLocation, serviceRadiusKm: Number(event.target.value) } }))} /></label>
              <label>Tamanho da equipe<input type="number" min="1" max="100" value={draftProfile.teamSize} onChange={(event) => setDraftProfile((current) => ({ ...current, teamSize: Number(event.target.value) }))} /></label>
            </div>

            <fieldset className="profile-options">
              <legend>Serviços que a empresa declara executar</legend>
              {editableProfileSkillIds.map((skillId) => {
                const skill = draftProfile.skills.find((item) => item.id === skillId);
                return (
                  <div className="profile-option" key={skillId}>
                    <label aria-label={skillCatalog[skillId].label} htmlFor={`skill-${skillId}`}>
                      <input id={`skill-${skillId}`} type="checkbox" checked={Boolean(skill)} onChange={(event) => toggleSkill(skillId, event.target.checked)} />
                      <span><b>{skillCatalog[skillId].label}</b><small>{skill ? "Entra no cálculo" : "Fora do perfil"}</small></span>
                    </label>
                    <select aria-label={`Nível em ${skillCatalog[skillId].label}`} disabled={!skill} value={skill?.level ?? "experienced"} onChange={(event) => changeSkillLevel(skillId, event.target.value as SkillLevel)}>
                      {Object.entries(levelLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                    </select>
                  </div>
                );
              })}
            </fieldset>

            <fieldset className="profile-options capability-options">
              <legend>Capacidade operacional</legend>
              {(Object.entries(capabilityCatalog) as Array<[CapabilityId, string]>).map(([capabilityId, label]) => (
                <label className="capability-option" key={capabilityId}>
                  <input type="checkbox" checked={draftProfile.capabilities.includes(capabilityId)} onChange={(event) => toggleCapability(capabilityId, event.target.checked)} />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>

            <div className="profile-disclosure"><b>Como funciona agora</b><span>O perfil fica salvo neste navegador. Ao atualizar, a IA lê o texto público e extrai requisitos com evidências; o score compara somente o que foi declarado aqui.</span></div>
            {profileError ? <p className="form-error" role="alert">{profileError}</p> : null}
            <button className="primary-action" type="button" disabled={profileSaving || draftProfile.skills.length === 0} onClick={saveProfile}>{profileSaving ? "Recalculando 12 oportunidades…" : "Salvar perfil e recalcular matches"}</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
