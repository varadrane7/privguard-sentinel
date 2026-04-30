#!/usr/bin/env node
import * as path from "path";
import * as fs from "fs";
import { Command } from "commander";
import { traverseDirectory, readFile } from "./traversal";
import { scanFileContent } from "./rules";
import { calculateScores, makeDecision } from "./scorer";
import { SafeCommitReport } from "./types";

const program = new Command();

program
  .name("safecommit")
  .description("SafeCommit — Privacy & Insider Threat static analysis scanner")
  .version("1.0.0")
  .argument("<target>", "Directory or file to scan")
  .option("-o, --output <file>", "Write JSON report to file", "safecommit-report.json")
  .option("--no-report", "Skip writing JSON report to disk")
  .option("--fail-on-block", "Exit with code 1 if decision is BLOCK")
  .parse(process.argv);

const [target] = program.args;
const opts = program.opts();

async function run() {
  const resolvedTarget = path.resolve(target);

  if (!fs.existsSync(resolvedTarget)) {
    console.error(`[SafeCommit] ERROR: Target not found: ${resolvedTarget}`);
    process.exit(2);
  }

  const isFile = fs.statSync(resolvedTarget).isFile();
  const files = isFile ? [resolvedTarget] : traverseDirectory(resolvedTarget);

  console.log(`\n[SafeCommit] Scanning ${files.length} file(s) in: ${resolvedTarget}\n`);

  const allFindings = [];

  for (const file of files) {
    const relativePath = path.relative(resolvedTarget, file);
    console.log(`  Scanning: ${relativePath || path.basename(file)}`);
    try {
      const content = readFile(file);
      const findings = scanFileContent(file, content);
      if (findings.length > 0) {
        console.log(`    ⚠  ${findings.length} finding(s) detected`);
      }
      allFindings.push(...findings);
    } catch (err) {
      console.warn(`    [WARN] Could not read file: ${file}`);
    }
  }

  const scores = calculateScores(allFindings);
  const decision = makeDecision(scores, allFindings);

  const severityCounts = {
    criticalCount: allFindings.filter((f) => f.severity === "CRITICAL").length,
    highCount: allFindings.filter((f) => f.severity === "HIGH").length,
    mediumCount: allFindings.filter((f) => f.severity === "MEDIUM").length,
    lowCount: allFindings.filter((f) => f.severity === "LOW").length,
  };

  const report: SafeCommitReport = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    scannedDirectory: resolvedTarget,
    overallDecision: decision,
    scores,
    findings: allFindings,
    summary: {
      totalFiles: files.length,
      totalFindings: allFindings.length,
      ...severityCounts,
    },
  };

  // Console output
  console.log("\n" + "=".repeat(60));
  console.log("  SafeCommit Scan Results");
  console.log("=".repeat(60));
  console.log(`  Decision   : ${decision}`);
  console.log(`  Overall    : ${scores.overall}/100`);
  console.log(`  Privacy    : ${scores.privacy}/100`);
  console.log(`  Threat     : ${scores.threat}/100`);
  console.log(`  Confidence : ${scores.confidence}%`);
  console.log(`  Findings   : ${allFindings.length} total (${severityCounts.criticalCount} critical, ${severityCounts.highCount} high)`);
  console.log("=".repeat(60));

  if (allFindings.length > 0) {
    console.log("\n  Findings:\n");
    for (const f of allFindings) {
      const icon = f.severity === "CRITICAL" ? "🚨" : f.severity === "HIGH" ? "⛔" : f.severity === "MEDIUM" ? "⚠️" : "ℹ️";
      console.log(`  ${icon} [${f.severity}] ${f.ruleTriggered}`);
      console.log(`     File: ${path.relative(resolvedTarget, f.file)} (line ${f.line})`);
      console.log(`     Fix : ${f.recommendation}`);
      console.log();
    }
  }

  // Write JSON report
  if (opts.report !== false) {
    const outputPath = path.resolve(opts.output);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`  Report saved to: ${outputPath}\n`);
  }

  if (opts.failOnBlock && decision === "BLOCK") {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("[SafeCommit] Fatal error:", err);
  process.exit(2);
});
