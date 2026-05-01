import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scores, summary, findings, overallDecision, scannedDirectory, timestamp, privacyDiff } = body;

    const report = await prisma.report.create({
      data: {
        timestamp,
        scannedDirectory,
        overallDecision,
        overallScore: scores.overall,
        privacyScore: scores.privacy,
        securityScore: scores.security ?? 0,
        aiSafetyScore: scores.aiSafety ?? 0,
        backdoorRiskScore: scores.backdoorRisk ?? 0,
        confidenceScore: scores.confidence,
        totalFiles: summary.totalFiles,
        totalFindings: summary.totalFindings,
        criticalCount: summary.criticalCount,
        highCount: summary.highCount,
        mediumCount: summary.mediumCount,
        lowCount: summary.lowCount,
        qualityCount: summary.byCategory?.quality ?? 0,
        securityCount: summary.byCategory?.security ?? 0,
        privacyCount: summary.byCategory?.privacy ?? 0,
        aiSafetyCount: summary.byCategory?.ai_safety ?? 0,
        backdoorCount: summary.byCategory?.backdoor ?? 0,
        privacyDiffJson: privacyDiff ? JSON.stringify(privacyDiff) : null,
        findings: {
          create: findings.map((f: {
            id: string; type: string; severity: string; file: string; line: number;
            snippet: string; ruleId?: string; ruleTriggered: string;
            recommendation: string; whyItMatters?: string;
            llmReason?: string; llmFix?: string; llmIntent?: string;
          }) => ({
            findingId: f.id,
            type: f.type,
            severity: f.severity,
            file: f.file,
            line: f.line,
            snippet: f.snippet,
            ruleId: f.ruleId ?? "",
            ruleTriggered: f.ruleTriggered,
            recommendation: f.recommendation,
            whyItMatters: f.whyItMatters ?? "",
            llmReason: f.llmReason,
            llmFix: f.llmFix,
            llmIntent: f.llmIntent,
          })),
        },
      },
      include: { findings: true },
    });

    return NextResponse.json({ success: true, reportId: report.id }, { status: 201 });
  } catch (err) {
    console.error("[API /reports POST]", err);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      include: { findings: true },
    });
    return NextResponse.json(reports);
  } catch (err) {
    console.error("[API /reports GET]", err);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
