export type DecisionType = "Safe to Merge" | "Needs Review" | "Do Not Merge";
export type FindingType = "quality" | "security" | "privacy" | "ai_safety" | "backdoor";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Finding {
  id: string;
  type: FindingType;
  severity: Severity;
  file: string;
  line: number;
  snippet: string;
  ruleId: string;
  ruleTriggered: string;
  recommendation: string;
  whyItMatters: string;
  llmConfirmed?: boolean;
  llmReason?: string;
  llmFix?: string;
  llmIntent?: string;
}

export interface Scores {
  overall: number;
  privacy: number;
  security: number;
  aiSafety: number;
  backdoorRisk: number;
  confidence: number;
}

export interface PrivacyDiff {
  before: { piiFields: string[]; thirdParties: string[]; loggingRisk: string };
  after: { piiFields: string[]; thirdParties: string[]; loggingRisk: string };
  riskChangePct: number;
}

export interface PrivGuardReport {
  version: string;
  timestamp: string;
  scannedDirectory: string;
  overallDecision: DecisionType;
  scores: Scores;
  findings: Finding[];
  privacyDiff: PrivacyDiff;
  summary: {
    totalFiles: number;
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    byCategory: Record<FindingType, number>;
  };
}
