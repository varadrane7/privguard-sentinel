import { DecisionType, Finding, Scores } from "./types";

const SEVERITY_WEIGHTS = {
  LOW: 5,
  MEDIUM: 15,
  HIGH: 30,
  CRITICAL: 50,
};

export function calculateScores(findings: Finding[]): Scores {
  const privacyFindings = findings.filter((f) => f.type === "privacy");
  const threatFindings = findings.filter((f) => f.type === "threat");

  const privacyRaw = privacyFindings.reduce(
    (sum, f) => sum + SEVERITY_WEIGHTS[f.severity],
    0
  );
  const threatRaw = threatFindings.reduce(
    (sum, f) => sum + SEVERITY_WEIGHTS[f.severity],
    0
  );

  const privacy = Math.min(100, privacyRaw);
  const threat = Math.min(100, threatRaw);
  const overall = Math.min(100, Math.round((privacy + threat) / 2));

  // Confidence: based on how many findings were found vs files scanned
  const confidence = findings.length > 0 ? Math.min(95, 60 + findings.length * 5) : 50;

  return { privacy, threat, overall, confidence };
}

export function makeDecision(scores: Scores, findings: Finding[]): DecisionType {
  const hasCritical = findings.some((f) => f.severity === "CRITICAL");
  if (hasCritical || scores.overall >= 70) return "BLOCK";
  if (scores.overall >= 30 || findings.length > 0) return "WARNING";
  return "PASS";
}
