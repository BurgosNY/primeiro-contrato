import type { Metadata } from "next";
import snapshotJson from "@/data/itapoa-opportunities.public.json";
import { ItapoaExperience } from "./ItapoaExperience";
import type { OpportunitySnapshot } from "./domain";
import { matchOpportunities } from "./matching";
import { defaultProfile } from "./profile";

const snapshot = snapshotJson as unknown as OpportunitySnapshot;

export const metadata: Metadata = {
  title: "Empreiteiro em Itapoá | Primeiro Contrato",
  description: "A experiência atual do Primeiro Contrato com oportunidades públicas abertas em Itapoá, Santa Catarina.",
  openGraph: {
    title: "Empreiteiro em Itapoá | Primeiro Contrato",
    description: "12 oportunidades públicas abertas reunidas para pequenos prestadores de Itapoá.",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Empreiteiro em Itapoá | Primeiro Contrato",
    description: "12 oportunidades públicas abertas reunidas para pequenos prestadores de Itapoá.",
    images: [],
  },
};

export default function ItapoaPage() {
  return (
    <ItapoaExperience
      initialProfile={defaultProfile}
      initialMatches={matchOpportunities(defaultProfile, snapshot.opportunities)}
      snapshot={snapshot}
    />
  );
}
