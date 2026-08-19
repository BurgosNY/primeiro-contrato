export type OnboardingStage =
  | "collect_company"
  | "review_company"
  | "review_documents"
  | "review_profile"
  | "preferences"
  | "ready";

export type OnboardingChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CompanyResearch = {
  cnpj: string;
  legalName: string;
  tradingName: string;
  status: string;
  openedAt: string;
  legalNature: string;
  size: string;
  mainActivity: string;
  municipality: string;
  state: string;
  address: string;
  isMei: boolean | null;
  isSimple: boolean | null;
  annualCeiling: string;
  verificationStatus: "verified" | "partial" | "not_found";
  sourceLabel: string;
  sourceUrl: string;
};

export type CompanyDocumentPreview = {
  id: string;
  title: string;
  kind: "registry" | "website" | "certificate" | "document" | "source";
  domain: string;
  url: string;
  description: string;
  verificationStatus: "located" | "reference";
};

export type OnboardingContext = {
  company: CompanyResearch | null;
  documents: CompanyDocumentPreview[];
};

export type OnboardingChatRequest = {
  message: string;
  stage: OnboardingStage;
  history: OnboardingChatMessage[];
  context: OnboardingContext;
};

export type OnboardingChatReply = {
  message: string;
  stage: OnboardingStage;
  company: CompanyResearch | null;
  documents: CompanyDocumentPreview[];
  quickReplies: string[];
  model: string;
  usedWebSearch: boolean;
};
