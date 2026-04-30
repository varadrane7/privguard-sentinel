import { prisma } from "@/lib/prisma";
import Link from "next/link";

function DecisionBadge({ decision }: { decision: string }) {
  const colors: Record<string, string> = {
    BLOCK: "bg-red-100 text-red-800 border border-red-300",
    WARNING: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    PASS: "bg-green-100 text-green-800 border border-green-300",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[decision] ?? "bg-gray-100 text-gray-800"}`}>
      {decision}
    </span>
  );
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

export default async function DashboardPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    include: { findings: true },
  });

  const latest = reports[0];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">SC</div>
          <span className="text-lg font-semibold tracking-tight">SafeCommit</span>
          <span className="text-gray-500 text-sm">Privacy & Threat Guardian</span>
        </div>
        <span className="text-gray-500 text-sm">{reports.length} scan{reports.length !== 1 ? "s" : ""} recorded</span>
      </header>

      <main className="px-8 py-8 max-w-6xl mx-auto space-y-8">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="text-6xl mb-4">🛡️</div>
            <h2 className="text-2xl font-bold mb-2">No scans yet</h2>
            <p className="text-gray-400 max-w-md">
              Run the SafeCommit scanner and POST the <code className="bg-gray-800 px-1 rounded">safecommit-report.json</code> to <code className="bg-gray-800 px-1 rounded">/api/reports</code> to see results here.
            </p>
            <pre className="mt-6 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-green-400 text-left">
{`# Scan the sample app:
npx ts-node packages/scanner/src/index.ts \\
  packages/sample-app/src -o report.json

# Send to dashboard:
curl -X POST http://localhost:3000/api/reports \\
  -H "Content-Type: application/json" \\
  -d @report.json`}
            </pre>
          </div>
        ) : (
          <>
            {/* Latest scan hero */}
            {latest && (
              <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Latest Scan</h2>
                    <p className="text-gray-400 text-sm">{latest.scannedDirectory}</p>
                    <p className="text-gray-600 text-xs mt-1">{new Date(latest.timestamp).toLocaleString()}</p>
                  </div>
                  <DecisionBadge decision={latest.overallDecision} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Overall Risk", value: latest.overallScore, color: "bg-red-500" },
                    { label: "Privacy Score", value: latest.privacyScore, color: "bg-orange-500" },
                    { label: "Threat Score", value: latest.threatScore, color: "bg-purple-500" },
                    { label: "Confidence", value: latest.confidenceScore, color: "bg-blue-500" },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-800 rounded-xl p-4">
                      <div className="text-2xl font-bold mb-1">{s.value}<span className="text-sm text-gray-400">/100</span></div>
                      <div className="text-xs text-gray-400 mb-2">{s.label}</div>
                      <ScoreBar value={s.value} color={s.color} />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Critical", count: latest.criticalCount, color: "text-red-400" },
                    { label: "High", count: latest.highCount, color: "text-orange-400" },
                    { label: "Medium", count: latest.mediumCount, color: "text-yellow-400" },
                    { label: "Low", count: latest.lowCount, color: "text-blue-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                      <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
                      <span className="text-sm text-gray-400">{s.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Findings table for latest scan */}
            {latest && latest.findings.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold mb-4">Findings — Latest Scan</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 text-left">
                        <th className="pb-3 pr-4">Severity</th>
                        <th className="pb-3 pr-4">Rule</th>
                        <th className="pb-3 pr-4">File</th>
                        <th className="pb-3 pr-4">Line</th>
                        <th className="pb-3">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {latest.findings.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 pr-4">
                            <SeverityBadge severity={f.severity} />
                          </td>
                          <td className="py-3 pr-4 font-medium">{f.ruleTriggered}</td>
                          <td className="py-3 pr-4 text-gray-400 font-mono text-xs truncate max-w-xs">
                            {f.file.split(/[\\/]/).slice(-2).join("/")}:{f.line}
                          </td>
                          <td className="py-3 pr-4 text-gray-500">{f.line}</td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${f.type === "privacy" ? "bg-orange-900/40 text-orange-400" : "bg-purple-900/40 text-purple-400"}`}>
                              {f.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* All scans history */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Scan History</h2>
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-5 py-4">
                    <div>
                      <div className="font-mono text-sm text-gray-200">{r.scannedDirectory.split(/[\\/]/).slice(-2).join("/")}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{new Date(r.timestamp).toLocaleString()} · {r.totalFindings} findings in {r.totalFiles} files</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">{r.overallScore}/100</span>
                      <DecisionBadge decision={r.overallDecision} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    CRITICAL: "bg-red-900/50 text-red-400 border border-red-800",
    HIGH: "bg-orange-900/50 text-orange-400 border border-orange-800",
    MEDIUM: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
    LOW: "bg-blue-900/50 text-blue-400 border border-blue-800",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${map[severity] ?? "bg-gray-800 text-gray-400"}`}>
      {severity}
    </span>
  );
}
