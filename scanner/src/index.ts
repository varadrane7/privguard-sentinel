#!/usr/bin/env node
import * as path from "path";
import * as fs from "fs";
import { Command } from "commander";
import { traverseDirectory, readFile } from "./traversal";
import { scanFileContent } from "./rules";
import { calculateScores, makeDecision } from "./scorer";
import { analyzeWithLLM } from "./llm";
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
  .option("--llm", "Enable Stage 2 LLM analysis via Ollama to reduce false positives")
  .option("--llm-model <model>", "Ollama model to use for Stage 2", "mistral")
  .option("--llm-url <url>", "Ollama base URL", "http://localhost:11434")
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
        console.log(`    [!] ${findings.length} finding(s) detected`);
      }
      allFindings.push(...findings);
    } catch (err) {
      console.warn(`    [WARN] Could not read file: ${file}`);
    }
  }

  // Stage 2: LLM analysis
  let llmDismissed = 0;
  if (opts.llm) {
    console.log(`\n[SafeCommit] Stage 2: Running LLM analysis (model: ${opts.llmModel})...\n`);
    for (const finding of allFindings) {
      process.stdout.write(`  Analyzing: ${path.basename(finding.file)} line ${finding.line} ... `);
      const result = await analyzeWithLLM(
        path.basename(finding.file),
        finding.line,
        finding.snippet,
        opts.llmModel,
        opts.llmUrl
      );
      finding.llmConfirmed = result.isViolation;
      finding.llmViolationType = result.type;
      finding.llmReason = result.reason;
      if (!result.isViolation) {
        llmDismissed++;
        console.log(`DISMISSED (${result.reason.slice(0, 60)})`);
      } else {
        console.log(`CONFIRMED [${result.type}]`);
      }
    }
    console.log(`\n  LLM confirmed: ${allFindings.length - llmDismissed} | dismissed: ${llmDismissed}\n`);
  }

  // Score only confirmed findings when LLM is active
  const scoredFindings = opts.llm
    ? allFindings.filter((f) => f.llmConfirmed !== false)
    : allFindings;

  const scores = calculateScores(scoredFindings);
  const decision = makeDecision(scores, scoredFindings);

  const severityCounts = {
    criticalCount: scoredFindings.filter((f) => f.severity === "CRITICAL").length,
    highCount: scoredFindings.filter((f) => f.severity === "HIGH").length,
    mediumCount: scoredFindings.filter((f) => f.severity === "MEDIUM").length,
    lowCount: scoredFindings.filter((f) => f.severity === "LOW").length,
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
      totalFindings: scoredFindings.length,
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
  console.log(`  Findings   : ${scoredFindings.length} total (${severityCounts.criticalCount} critical, ${severityCounts.highCount} high)`);
  if (opts.llm && llmDismissed > 0) {
    console.log(`  Dismissed  : ${llmDismissed} false positive(s) by LLM`);
  }
  console.log("=".repeat(60));

  if (scoredFindings.length > 0) {
    console.log("\n  Findings:\n");
    for (const f of scoredFindings) {
      console.log(`  [${f.severity}] ${f.ruleTriggered}`);
      console.log(`     File: ${path.relative(resolvedTarget, f.file)} (line ${f.line})`);
      if (f.llmReason) console.log(`     LLM : ${f.llmReason}`);
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
