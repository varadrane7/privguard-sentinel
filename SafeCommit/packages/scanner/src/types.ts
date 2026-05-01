export type DecisionType = "PASS" | "WARNING" | "BLOCK";
export type FindingType = "privacy" | "threat";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Finding {
  id: string;
  type: FindingType;
  severity: Severity;
  file: string;
  line: number;
  snippet: string;
  ruleTriggered: string;
  recommendation: string;
  llmConfirmed?: boolean;
  llmViolationType?: string;
  llmReason?: string;
}

export interface Scores {
  privacy: number;
  threat: number;
  overall: number;
  confidence: number;
}

export interface SafeCommitReport {
  version: "1.0";
  timestamp: string;
  scannedDirectory: string;
  overallDecision: DecisionType;
  scores: Scores;
  findings: Finding[];
  summary: {
    totalFiles: number;
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}
