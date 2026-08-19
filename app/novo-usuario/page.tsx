import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Novo usuário | Primeiro Contrato",
  description: "A próxima experiência de entrada do Primeiro Contrato.",
  openGraph: {
    title: "Novo usuário | Primeiro Contrato",
    description: "A próxima experiência de entrada do Primeiro Contrato.",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Novo usuário | Primeiro Contrato",
    description: "A próxima experiência de entrada do Primeiro Contrato.",
    images: [],
  },
};

export default function NewUserPage() {
  return (
    <main className="new-user-page">
      <header className="new-user-header">
        <Link className="identity-brand" href="/" aria-label="Voltar à escolha de usuário">
          <span className="brand-mark">1º</span>
          <span>Primeiro Contrato</span>
        </Link>
        <Link className="new-user-back" href="/">← Trocar usuário</Link>
      </header>

      <section className="new-user-content" aria-labelledby="new-user-title">
        <div className="new-user-marker" aria-hidden="true">+</div>
        <p className="eyebrow">Novo usuário</p>
        <h1 id="new-user-title">A próxima experiência começa aqui.</h1>
        <p>
          Este caminho está separado da demonstração de Itapoá para receber o
          novo onboarding que vamos desenhar. Nenhum perfil foi criado ainda.
        </p>
        <div className="new-user-status">
          <span aria-hidden="true" />
          <strong>Experiência aguardando definição</strong>
          <p>Voltaremos a esta rota quando o próximo fluxo estiver pronto.</p>
        </div>
        <Link className="new-user-action" href="/">Escolher outro usuário</Link>
      </section>
    </main>
  );
}
