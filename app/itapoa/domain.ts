export type SkillLevel = "basic" | "experienced" | "specialist";

export type SkillId =
  | "gutters_roofing"
  | "masonry"
  | "concrete_structures"
  | "basic_plumbing"
  | "drywall"
  | "electrical"
  | "metalwork"
  | "signage"
  | "outdoor_structures"
  | "locksmith"
  | "gate_automation"
  | "sanitation_systems"
  | "painting"
  | "carpentry"
  | "hvac"
  | "cleaning"
  | "landscaping"
  | "other";

export type CapabilityId =
  | "technical_visit"
  | "materials_supply"
  | "local_transport"
  | "site_cleanup"
  | "waste_disposal";

export type ProfileSkill = {
  id: SkillId;
  level: SkillLevel;
  evidence: "self_declared";
};

export type ProviderProfile = {
  schemaVersion: "1.0";
  id: string;
  displayName: string;
  ownerName: string;
  demoProfile: boolean;
  legal: {
    type: "MEI";
    status: "active";
    evidence: "demo_fixture";
  };
  baseLocation: {
    city: string;
    state: string;
    serviceRadiusKm: number;
  };
  teamSize: number;
  skills: ProfileSkill[];
  capabilities: CapabilityId[];
  exclusions: SkillId[];
  updatedAt: string;
};

export type QualityFlag = {
  code: string;
  kind: "verified" | "heuristic";
  severity: "warning" | "critical";
  evidence: string;
  fields?: string[];
  evidenceTerms?: string[];
};

export type PublicOpportunity = {
  opportunityId: string;
  sourceUrl: string;
  sourceStatus: string;
  capturedAt: string;
  activity: string;
  serviceName: string;
  specification: string;
  summaryFromListing: string;
  description: string;
  requestingAgency: string;
  executionLocation: {
    name: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    reference: string | null;
  };
  proposalClosesAt: string;
  executionDeadlineRaw: string;
  payment: {
    method: string | null;
    term: string | null;
  };
  onlyMei: boolean;
  attachments: Array<{ localPath?: string; publicPath?: string; name?: string }>;
  qualityFlags: QualityFlag[];
};

export type OpportunitySnapshot = {
  schemaVersion: string;
  snapshot: {
    source: string;
    sourceUrl: string;
    capturedAt: string;
    coverage: {
      declaredOpportunityCount: number;
      declaredPageCount: number;
      pagesTraversed: number[];
      uniqueIds: number;
      detailsProcessed: number;
      detailFailures: number;
      duplicateIds: string[];
      declaredMissingCount: number;
    };
    binaryQa: {
      candidates: number;
      downloaded: number;
      failed: number;
      accountingValid: boolean;
    };
  };
  opportunities: PublicOpportunity[];
};

export type MatchBand = "recommended" | "review" | "not_fit";

export type MatchResult = {
  opportunityId: string;
  score: number;
  band: MatchBand;
  eligible: boolean;
  blocked: boolean;
  breakdown: {
    legalAndLocation: number;
    technical: number;
    operational: number;
    evidence: number;
  };
  reasons: string[];
  gaps: string[];
  blockers: string[];
  requiredSkills: SkillId[];
  requiredCapabilities: CapabilityId[];
};

export type OpportunityRequirement = {
  opportunityId: string;
  summary: string;
  skills: Array<{
    id: SkillId;
    importance: "required" | "supporting";
    evidence: string;
  }>;
  capabilities: Array<{
    id: CapabilityId;
    required: boolean;
    evidence: string;
  }>;
  complexity: "simple" | "multi_trade" | "specialized";
  confidence: number;
  model: string;
  extractedAt: string;
  contentHash: string;
};

export type MatchApiResponse = {
  profile: ProviderProfile;
  matches: MatchResult[];
  generatedAt: string;
  scoringVersion: "itapoa-v2-ai-requirements";
};

export type PersistedState = {
  snapshot: OpportunitySnapshot;
  profile: ProviderProfile;
  matches: MatchApiResponse;
  lastRefresh: {
    status: "seeded" | "succeeded" | "failed" | "running";
    source: "committed_snapshot" | "live_contrata_brasil";
    capturedAt: string;
    opportunityCount: number;
    requirementsCount: number;
    model: string | null;
    message?: string;
  };
};
