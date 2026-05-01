import { DecisionType, Finding, FindingType, Scores } from "./types";

const SEVERITY_WEIGHTS = {
  LOW: 5,
  MEDIUM: 15,
  HIGH: 30,
  CRITICAL: 50,
};

function scoreForType(findings: Finding[], type: FindingType): number {
  const raw = findings
    .filter((f) => f.type === type)
    .reduce((sum, f) => sum + SEVERITY_WEIGHTS[f.severity], 0);
  return Math.min(100, raw);
}

export function calculateScores(findings: Finding[]): Scores {
  const privacy = scoreForType(findings, "privacy");
  const security = scoreForType(findings, "security");
  const aiSafety = scoreForType(findings, "ai_safety");
  const backdoorRisk = scoreForType(findings, "backdoor");
  const quality = scoreForType(findings, "quality");

  const overall = Math.min(100, Math.round((privacy + security + aiSafety + backdoorRisk + quality) / 4));
  const confidence = findings.length > 0 ? Math.min(95, 60 + findings.length * 3) : 50;

  return { overall, privacy, security, aiSafety, backdoorRisk, confidence };
}

export function makeDecision(scores: Scores, findings: Finding[]): DecisionType {
  const hasCritical = findings.some((f) => f.severity === "CRITICAL");
  if (hasCritical || scores.overall >= 70) return "Do Not Merge";
  if (scores.overall >= 30 || findings.length > 0) return "Needs Review";
  return "Safe to Merge";
}
