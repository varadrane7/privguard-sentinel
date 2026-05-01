"use client";

import { useState, useEffect, useCallback } from "react";
import { PrivGuardReport, Finding, FindingType, DecisionType } from "@/lib/reportTypes";
import { DEMO_SCENARIOS } from "@/lib/demoData";

// ── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(score: number): string {
  if (score <= 30) return "#10b981";
  if (score <= 60) return "#f59e0b";
  if (score <= 80) return "#f97316";
  return "#f43f5e";
}

function riskGaugeClass(score: number): string {
  if (score <= 30) return "gauge-safe";
  if (score <= 60) return "gauge-warn";
  if (score <= 80) return "gauge-high";
  return "gauge-crit";
}

const DECISION_STYLE: Record<DecisionType, { cls: string; icon: string }> = {
  "Safe to Merge": { cls: "decision-safe",   icon: "✅" },
  "Needs Review":  { cls: "decision-review", icon: "⚠️" },
  "Do Not Merge":  { cls: "decision-block",  icon: "🚫" },
};

const CAT_LABELS: Record<FindingType, string> = {
  privacy:   "Privacy",
  security:  "Security",
  quality:   "Quality",
  ai_safety: "AI Safety",
  backdoor:  "Backdoor",
};

const SEV_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

// ── ScoreGauge ────────────────────────────────────────────────────────────────

function ScoreGauge({ label, score }: { label: string; score: number }) {
  const R = 38;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC * (1 - score / 100);
  const color = riskColor(score);

  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className={`relative ${riskGaugeClass(score)}`}>
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90 transition-all duration-700">
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle
            cx="50" cy="50" r={R} fill="none"
            stroke={color} strokeWidth="7"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">{label}</span>
    </div>
  );
}

// ── IssueCard ────────────────────────────────────────────────────────────────

function IssueCard({ f }: { f: Finding }) {
  const [open, setOpen] = useState(false);
  const sevCls = `badge-${f.severity.toLowerCase()}`;
  const catCls = `cat-${f.type}`;

  return (
    <div
      className="glass card-hover cursor-pointer overflow-hidden"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex flex-col items-start gap-2 min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sevCls}`}>{f.severity}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${catCls}`}>{CAT_LABELS[f.type]}</span>
            <span className="text-xs text-gray-500 font-mono">{f.ruleId}</span>
          </div>
          <p className="text-sm font-semibold text-gray-100">{f.ruleTriggered}</p>
          <p className="text-xs text-gray-400 font-mono">
            {f.file.split("/").slice(-2).join("/")} · line {f.line}
          </p>
        </div>
        <span className={`text-gray-500 text-sm transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </div>

      {open && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Evidence</p>
            <div className="snippet">{f.snippet.slice(0, 400)}</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Why it matters</p>
            <p className="text-sm text-gray-300">{f.whyItMatters || f.recommendation}</p>
          </div>
          {f.llmReason && (
            <div>
              <p className="text-xs font-semibold text-yellow-500/70 uppercase tracking-wide mb-1">🤖 AI Analysis</p>
              <p className="text-sm text-yellow-200/80">{f.llmReason}</p>
              {f.llmIntent && (
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  f.llmIntent === "malicious" ? "badge-critical" :
                  f.llmIntent === "suspicious" ? "badge-high" :
                  f.llmIntent === "negligent" ? "badge-medium" : "badge-low"
                }`}>Intent: {f.llmIntent}</span>
              )}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-emerald-500/70 uppercase tracking-wide mb-1">Suggested Fix</p>
            {f.llmFix ? (
              <p className="text-sm text-emerald-300/80">{f.llmFix}</p>
            ) : (
              <p className="text-sm text-gray-300">{f.recommendation}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── PrivacyDiffTimeline ───────────────────────────────────────────────────────

function PrivacyDiffTimeline({ diff }: { report: PrivGuardReport; diff: PrivGuardReport["privacyDiff"] }) {
  const hasChanges = diff.riskChangePct > 0 ||
    JSON.stringify(diff.before) !== JSON.stringify(diff.after);

  const loggingColor: Record<string, string> = {
    none: "text-emerald-400", low: "text-yellow-400",
    medium: "text-orange-400", high: "text-rose-400",
  };

  return (
    <div className="glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-widest">Privacy Impact Timeline</h2>
        {diff.riskChangePct > 0 ? (
          <span className="text-rose-400 font-bold text-sm">+{diff.riskChangePct}% risk change</span>
        ) : (
          <span className="text-emerald-400 font-bold text-sm">No change</span>
        )}
      </div>

      {!hasChanges ? (
        <p className="text-sm text-gray-500">This PR does not change the privacy risk profile.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {(["before", "after"] as const).map((phase) => (
            <div key={phase} className={`rounded-xl p-4 space-y-2 border ${
              phase === "before"
                ? "bg-white/3 border-white/5"
                : "bg-rose-500/5 border-rose-500/20"
            }`}>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {phase === "before" ? "Before PR" : "After PR"}
              </p>
              <div>
                <p className="text-xs text-gray-500 mb-1">PII Collected</p>
                {diff[phase].piiFields.length === 0
                  ? <p className="text-xs text-emerald-400">None</p>
                  : diff[phase].piiFields.map((f) => (
                      <span key={f} className="inline-block text-xs bg-white/5 px-2 py-0.5 rounded-full mr-1 mb-1">{f}</span>
                    ))
                }
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Third Parties</p>
                {diff[phase].thirdParties.length === 0
                  ? <p className="text-xs text-emerald-400">None</p>
                  : diff[phase].thirdParties.map((t) => (
                      <span key={t} className="inline-block text-xs bg-rose-500/10 text-rose-300 px-2 py-0.5 rounded-full mr-1">{t}</span>
                    ))
                }
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Logging Risk</p>
                <p className={`text-xs font-semibold capitalize ${loggingColor[diff[phase].loggingRisk] ?? "text-gray-400"}`}>
                  {diff[phase].loggingRisk}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [report, setReport] = useState<PrivGuardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [filter, setFilter] = useState<FindingType | "all">("all");
  const [history, setHistory] = useState<PrivGuardReport[]>([]);

  const loadLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) return;
      const data: Array<{
        timestamp: string; scannedDirectory: string; overallDecision: string;
        overallScore: number; privacyScore: number; securityScore: number;
        aiSafetyScore: number; backdoorRiskScore: number; confidenceScore: number;
        totalFiles: number; totalFindings: number; criticalCount: number; highCount: number;
        mediumCount: number; lowCount: number; qualityCount: number; securityCount: number;
        privacyCount: number; aiSafetyCount: number; backdoorCount: number;
        privacyDiffJson: string | null;
        findings: Array<{
          findingId: string; type: string; severity: string; file: string; line: number;
          snippet: string; ruleId: string; ruleTriggered: string; recommendation: string;
          whyItMatters: string; llmReason?: string; llmFix?: string; llmIntent?: string;
        }>;
      }> = await res.json();

      if (!Array.isArray(data) || data.length === 0) return;

      const mapped: PrivGuardReport[] = data.map((r) => ({
        version: "2.0",
        timestamp: r.timestamp,
        scannedDirectory: r.scannedDirectory,
        overallDecision: r.overallDecision as DecisionType,
        scores: {
          overall: r.overallScore, privacy: r.privacyScore, security: r.securityScore,
          aiSafety: r.aiSafetyScore, backdoorRisk: r.backdoorRiskScore, confidence: r.confidenceScore,
        },
        findings: r.findings.map((f) => ({
          id: f.findingId, type: f.type as FindingType, severity: f.severity as Finding["severity"],
          file: f.file, line: f.line, snippet: f.snippet, ruleId: f.ruleId,
          ruleTriggered: f.ruleTriggered, recommendation: f.recommendation,
          whyItMatters: f.whyItMatters, llmReason: f.llmReason, llmFix: f.llmFix, llmIntent: f.llmIntent,
        })),
        privacyDiff: r.privacyDiffJson
          ? JSON.parse(r.privacyDiffJson)
          : { before: { piiFields: [], thirdParties: [], loggingRisk: "none" }, after: { piiFields: [], thirdParties: [], loggingRisk: "none" }, riskChangePct: 0 },
        summary: {
          totalFiles: r.totalFiles, totalFindings: r.totalFindings,
          criticalCount: r.criticalCount, highCount: r.highCount,
          mediumCount: r.mediumCount, lowCount: r.lowCount,
          byCategory: { quality: r.qualityCount, security: r.securityCount, privacy: r.privacyCount, ai_safety: r.aiSafetyCount, backdoor: r.backdoorCount },
        },
      }));

      setHistory(mapped);
      setReport(mapped[0]);
    } catch {
      // API unavailable — no-op, demo mode still works
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  const selectDemo = (key: string) => {
    setActiveDemo(key);
    setReport(DEMO_SCENARIOS[key].report);
    setFilter("all");
  };

  const clearDemo = () => {
    setActiveDemo(null);
    if (history.length > 0) setReport(history[0]);
    else setReport(null);
  };

  const displayed = report;
  const filteredFindings = (displayed?.findings ?? [])
    .filter((f) => filter === "all" || f.type === filter)
    .sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));

  const catCounts = (displayed?.summary.byCategory) ?? { quality: 0, security: 0, privacy: 0, ai_safety: 0, backdoor: 0 };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 text-sm">Loading PrivGuard Nexus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              PrivGuard Nexus
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Unified AI Code Review · Privacy · Security · Backdoor · AI Safety</p>
          </div>
          <div className="flex items-center gap-2">
            {activeDemo && (
              <button onClick={clearDemo} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 transition-colors">
                ✕ Exit Demo
              </button>
            )}
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${activeDemo ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"}`}>
              {activeDemo ? "DEMO MODE" : history.length > 0 ? "LIVE" : "NO DATA"}
            </span>
          </div>
        </div>

        {/* ── Demo Buttons ──────────────────────────────────────────────── */}
        <div className="glass p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Demo Scenarios</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DEMO_SCENARIOS).map(([key, s]) => (
              <button
                key={key}
                onClick={() => selectDemo(key)}
                className={`group text-left px-4 py-2 rounded-xl border transition-all duration-200 ${
                  activeDemo === key
                    ? "border-indigo-500/60 bg-indigo-500/20 text-indigo-200"
                    : "border-white/8 bg-white/3 text-gray-400 hover:border-white/20 hover:text-gray-200 hover:bg-white/6"
                }`}
              >
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">{s.description}</p>
              </button>
            ))}
          </div>
        </div>

        {!displayed ? (
          /* ── Empty State ────────────────────────────────────────────── */
          <div className="glass p-12 text-center space-y-4">
            <div className="text-5xl">🔍</div>
            <h2 className="text-xl font-bold text-gray-200">No scans yet</h2>
            <p className="text-gray-400 text-sm max-w-lg mx-auto">
              Run the scanner against your repository, then POST the report to this dashboard, or click a Demo Scenario above.
            </p>
            <pre className="text-xs text-left inline-block bg-black/40 px-4 py-3 rounded-xl text-indigo-300 mt-4">
              {`node scanner/dist/index.js ./your-app -o report.json
curl -X POST http://localhost:3000/api/reports \\
  -H "Content-Type: application/json" \\
  -d @report.json`}
            </pre>
          </div>
        ) : (
          <>
            {/* ── Decision Banner ─────────────────────────────────────────── */}
            <div className={`glass p-6 flex items-center justify-between flex-wrap gap-4 ${DECISION_STYLE[displayed.overallDecision].cls}`}>
              <div className="flex items-center gap-4">
                <span className="text-4xl">{DECISION_STYLE[displayed.overallDecision].icon}</span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Merge Recommendation</p>
                  <h2 className="text-2xl font-extrabold">{displayed.overallDecision}</h2>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold">{displayed.summary.totalFiles}</p>
                  <p className="text-xs opacity-60">files</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{displayed.summary.totalFindings}</p>
                  <p className="text-xs opacity-60">findings</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{displayed.summary.criticalCount}</p>
                  <p className="text-xs opacity-60">critical</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{displayed.scores.confidence}%</p>
                  <p className="text-xs opacity-60">confidence</p>
                </div>
              </div>
            </div>

            {/* ── 5 Score Gauges ───────────────────────────────────────────── */}
            <div className="glass p-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Risk Intelligence Scores</p>
              <div className="flex justify-around flex-wrap gap-6">
                <ScoreGauge label="Overall Risk"  score={displayed.scores.overall} />
                <ScoreGauge label="Privacy"       score={displayed.scores.privacy} />
                <ScoreGauge label="Security"      score={displayed.scores.security} />
                <ScoreGauge label="AI Safety"     score={displayed.scores.aiSafety} />
                <ScoreGauge label="Backdoor Risk" score={displayed.scores.backdoorRisk} />
              </div>
              {/* Severity breakdown */}
              <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap gap-3">
                {[
                  { label: "Critical", count: displayed.summary.criticalCount, cls: "badge-critical" },
                  { label: "High",     count: displayed.summary.highCount,     cls: "badge-high" },
                  { label: "Medium",   count: displayed.summary.mediumCount,   cls: "badge-medium" },
                  { label: "Low",      count: displayed.summary.lowCount,      cls: "badge-low" },
                ].map(({ label, count, cls }) => (
                  <span key={label} className={`text-xs font-semibold px-3 py-1 rounded-full ${cls}`}>
                    {count} {label}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Privacy Diff Timeline ─────────────────────────────────────── */}
            <PrivacyDiffTimeline report={displayed} diff={displayed.privacyDiff} />

            {/* ── Findings ─────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                  Findings ({filteredFindings.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilter("all")}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${filter === "all" ? "border-indigo-500/60 bg-indigo-500/20 text-indigo-200" : "border-white/8 text-gray-400 hover:text-gray-200 hover:border-white/20"}`}
                  >
                    All {displayed.summary.totalFindings}
                  </button>
                  {(Object.entries(catCounts) as [FindingType, number][])
                    .filter(([, c]) => c > 0)
                    .map(([type, count]) => (
                      <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cat-${type} ${filter === type ? "opacity-100" : "opacity-60 hover:opacity-80"}`}
                      >
                        {CAT_LABELS[type]} {count}
                      </button>
                    ))}
                </div>
              </div>

              {filteredFindings.length === 0 ? (
                <div className="glass p-8 text-center">
                  <p className="text-emerald-400 text-4xl mb-2">✅</p>
                  <p className="text-gray-300 font-semibold">
                    {filter === "all" ? "No findings detected" : `No ${CAT_LABELS[filter as FindingType]} issues found`}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFindings.map((f) => <IssueCard key={f.id} f={f} />)}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Scan History ─────────────────────────────────────────────── */}
        {history.length > 1 && !activeDemo && (
          <div className="glass p-5 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Scan History</p>
            <div className="space-y-2">
              {history.map((r, i) => {
                const ds = DECISION_STYLE[r.overallDecision];
                return (
                  <button
                    key={i}
                    onClick={() => { setReport(r); setFilter("all"); }}
                    className={`w-full glass card-hover text-left p-3 flex items-center justify-between gap-4 ${
                      report === r ? "ring-1 ring-indigo-500/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{ds.icon}</span>
                      <div>
                        <p className={`text-sm font-semibold ${ds.cls.replace("decision-", "text-")}`}>
                          {r.overallDecision}
                        </p>
                        <p className="text-xs text-gray-500">{r.scannedDirectory}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 shrink-0">
                      <span>{r.summary.totalFindings} findings</span>
                      <span>{new Date(r.timestamp).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-600">PrivGuard Nexus v2.0 · Unified AI Code Review</p>
        </div>
      </div>
    </div>
  );
}
