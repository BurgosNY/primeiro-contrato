import type { Metadata } from "next";

import { NewUserOnboarding } from "./NewUserOnboarding";

export const metadata: Metadata = {
  title: "Novo usuário | Primeiro Contrato",
  description: "Onboarding assistido para organizar o perfil da empresa.",
  openGraph: {
    title: "Novo usuário | Primeiro Contrato",
    description: "Onboarding assistido para organizar o perfil da empresa.",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Novo usuário | Primeiro Contrato",
    description: "Onboarding assistido para organizar o perfil da empresa.",
    images: [],
  },
};

export default function NewUserPage() {
  return <NewUserOnboarding />;
}
