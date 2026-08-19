import Link from "next/link";

export default function UserChoicePage() {
  return (
    <main className="identity-gate">
      <section className="identity-shell" aria-labelledby="identity-title">
        <header className="identity-brand">
          <span className="brand-mark">1º</span>
          <span>Primeiro Contrato</span>
        </header>

        <div className="identity-intro">
          <p className="eyebrow">Escolha de usuário</p>
          <h1 id="identity-title">Quem está entrando?</h1>
          <p>
            Selecione uma experiência para continuar. Cada usuário começa com
            um contexto diferente para encontrar seu primeiro contrato público.
          </p>
        </div>

        <nav className="identity-options" aria-label="Usuários disponíveis">
          <Link className="identity-option identity-option-primary" href="/itapoa">
            <span className="identity-avatar" aria-hidden="true">JM</span>
            <span className="identity-option-copy">
              <small>Perfil pronto para a demonstração</small>
              <strong>Empreiteiro em Itapoá — SC</strong>
              <span>Acessar um perfil pronto com oportunidades locais ordenadas.</span>
            </span>
            <span className="identity-arrow" aria-hidden="true">→</span>
          </Link>

          <Link className="identity-option" href="/novo-usuario">
            <span className="identity-avatar identity-avatar-new" aria-hidden="true">+</span>
            <span className="identity-option-copy">
              <small>Onboarding assistido</small>
              <strong>Cadastrar uma empresa</strong>
              <span>Informar o CNPJ, revisar os dados encontrados e montar o perfil.</span>
            </span>
            <span className="identity-arrow" aria-hidden="true">→</span>
          </Link>
        </nav>

        <footer className="identity-footnote">
          Demonstração pública · nenhuma proposta é enviada sem confirmação
        </footer>
      </section>

      <aside className="identity-story" aria-label="Sobre o Primeiro Contrato">
        <div className="identity-story-grid" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </div>
        <div className="identity-story-content">
          <span className="story-index">01</span>
          <p>Oportunidades públicas que combinam com o seu negócio.</p>
          <div className="story-proof">
            <strong>12</strong>
            <span>oportunidades abertas preservadas no snapshot de Itapoá</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
