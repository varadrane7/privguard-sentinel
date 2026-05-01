import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scores, summary, findings, overallDecision, scannedDirectory, timestamp } = body;

    const report = await prisma.report.create({
      data: {
        timestamp,
        scannedDirectory,
        overallDecision,
        privacyScore: scores.privacy,
        threatScore: scores.threat,
        overallScore: scores.overall,
        confidenceScore: scores.confidence,
        totalFiles: summary.totalFiles,
        totalFindings: summary.totalFindings,
        criticalCount: summary.criticalCount,
        highCount: summary.highCount,
        mediumCount: summary.mediumCount,
        lowCount: summary.lowCount,
        findings: {
          create: findings.map((f: {
            id: string; type: string; severity: string; file: string;
            line: number; snippet: string; ruleTriggered: string; recommendation: string;
          }) => ({
            findingId: f.id,
            type: f.type,
            severity: f.severity,
            file: f.file,
            line: f.line,
            snippet: f.snippet,
            ruleTriggered: f.ruleTriggered,
            recommendation: f.recommendation,
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
