import { Finding, FindingType, Severity } from "./types";
import * as crypto from "crypto";

interface Rule {
  id: string;
  name: string;
  type: FindingType;
  severity: Severity;
  pattern: RegExp;
  recommendation: string;
}

const RULES: Rule[] = [
  // Privacy: PII in logs
  {
    id: "P001",
    name: "Sensitive Data Logged - Password",
    type: "privacy",
    severity: "CRITICAL",
    pattern: /(?:console\.log|logger\.(info|debug|warn|error)|log\.Printf?|print)\s*\(.*(?:password|passwd|pwd|secret)\b/i,
    recommendation: "Never log passwords or secrets. Remove this log statement entirely.",
  },
  {
    id: "P002",
    name: "Sensitive Data Logged - Email/PII",
    type: "privacy",
    severity: "HIGH",
    pattern: /(?:console\.log|logger\.(info|debug|warn|error)|log\.Printf?|print)\s*\(.*(?:email|ssn|social.?security|credit.?card|phone)/i,
    recommendation: "Avoid logging PII. Use masked or anonymized identifiers for debugging.",
  },
  {
    id: "P003",
    name: "Sensitive Data Logged - SSN",
    type: "privacy",
    severity: "CRITICAL",
    pattern: /(?:console\.log|logger\.(info|debug|warn|error)|log\.Printf?|print)\s*\(.*(?:ssn|getSsn|social_security)/i,
    recommendation: "Never log SSN or national ID numbers. This violates GDPR and CCPA.",
  },
  // Privacy: Unauthorized third-party data sharing
  {
    id: "P004",
    name: "Unauthorized Third-Party Data Transfer",
    type: "privacy",
    severity: "CRITICAL",
    pattern: /(?:fetch|axios\.post|axios\.get|requests\.post|http\.Post|HttpRequest)\s*\(?\s*['"`]https?:\/\/(?!(?:localhost|127\.0\.0\.1|your-api|internal))[^'"`\s]+['"`]/i,
    recommendation: "Audit all outbound HTTP calls. Ensure external endpoints are approved and PII is not transmitted without consent.",
  },
  {
    id: "P005",
    name: "Missing Consent Verification",
    type: "privacy",
    severity: "MEDIUM",
    pattern: /marketing_opt_in\s*[=:]\s*(?:true|1|yes)\b(?![\s\S]{0,200}consent)/i,
    recommendation: "Before setting marketing_opt_in to true, verify explicit user consent was collected via UI.",
  },
  // Threat: Admin bypass
  {
    id: "T001",
    name: "Hardcoded Admin Bypass",
    type: "threat",
    severity: "CRITICAL",
    pattern: /(?:x-bypass|x-admin-key|X-Bypass|bypass.?token|admin.?key)\s*[=:=!]{1,3}\s*['"`][^'"`]{3,}['"`]/i,
    recommendation: "Never use hardcoded bypass tokens. Use proper RBAC and role-based access control.",
  },
  {
    id: "T002",
    name: "Hardcoded Secret/Password in Code",
    type: "threat",
    severity: "CRITICAL",
    pattern: /(?:password|secret|api_key|apikey|token|key)\s*[=:]\s*['"`][A-Za-z0-9_\-]{6,}['"`]/i,
    recommendation: "Move secrets to environment variables or a secrets manager. Never hardcode credentials.",
  },
  // Threat: Code execution
  {
    id: "T003",
    name: "Dangerous Eval/Exec Usage",
    type: "threat",
    severity: "CRITICAL",
    pattern: /\b(?:eval\s*\(|exec\s*\(|os\.system\s*\(|exec\.Command\s*\(|subprocess\.(run|call|Popen)\s*\()/i,
    recommendation: "Avoid eval/exec with user-controlled input. Use safe alternatives or strict allowlists.",
  },
  {
    id: "T004",
    name: "Shell Command Injection Risk",
    type: "threat",
    severity: "HIGH",
    pattern: /exec\.Command\s*\([^)]*(?:req\.|request\.|r\.|query|param|input|cmd|run)\b/i,
    recommendation: "Executing user-supplied shell commands is extremely dangerous. Sanitize and validate all inputs.",
  },
  // Threat: Obfuscation
  {
    id: "T005",
    name: "Obfuscated Base64 Payload",
    type: "threat",
    severity: "HIGH",
    pattern: /(?:base64\.StdEncoding\.DecodeString|Buffer\.from|atob|base64_decode)\s*\(\s*['"`][A-Za-z0-9+/]{20,}={0,2}['"`]/i,
    recommendation: "Investigate base64-encoded strings for hidden payloads or obfuscated commands.",
  },
  // Threat: Exfiltration to suspicious domains
  {
    id: "T006",
    name: "Potential Data Exfiltration",
    type: "threat",
    severity: "CRITICAL",
    pattern: /https?:\/\/(?:sketchy|evil|exfil|malware|backdoor|c2|command|phish|dark|shadow)[a-z0-9.\-]*/i,
    recommendation: "Suspicious domain detected in outbound request. Block and investigate immediately.",
  },
  // Privacy: Credit card in code
  {
    id: "P006",
    name: "Credit Card Data Handling",
    type: "privacy",
    severity: "HIGH",
    pattern: /credit.?card|cc_number|card_number|cvv|cvc\b/i,
    recommendation: "Credit card data should only flow through PCI-DSS compliant processors. Do not store or log card data.",
  },
];

function extractSnippet(lines: string[], lineIndex: number): string {
  const start = Math.max(0, lineIndex - 10);
  const end = Math.min(lines.length - 1, lineIndex + 10);
  return lines.slice(start, end + 1).join("\n").trim().slice(0, 1500);
}

export function scanFileContent(filePath: string, content: string): Finding[] {
  const findings: Finding[] = [];
  const lines = content.split("\n");

  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i++) {
      if (rule.pattern.test(lines[i])) {
        findings.push({
          id: crypto.randomUUID(),
          type: rule.type,
          severity: rule.severity,
          file: filePath,
          line: i + 1,
          snippet: extractSnippet(lines, i),
          ruleTriggered: rule.name,
          recommendation: rule.recommendation,
        });
        rule.pattern.lastIndex = 0;
      }
    }
  }

  return findings;
}
