# SafeCommit — Phase 2 Manual Verification Guide

This document walks you through manually verifying that every Phase 2 task is working correctly. Run each section in order; later sections depend on earlier ones succeeding.

---

## Prerequisites — Do This First

### 1. Install dependencies

```bash
# From the repo root
cd SafeCommit
npm install

# Install scanner package dependencies
cd packages/scanner
npm install

# Install dashboard dependencies
cd ../dashboard
npm install
```

### 2. Build the scanner

```bash
cd SafeCommit/packages/scanner
npm run build
```

Expected: a `dist/` folder is created with no TypeScript errors.

### 3. (For Task 2.3 only) Install and start Ollama

> Skip this section if you only want to verify Tasks 2.1, 2.2, and 2.4 without LLM.

1. Download Ollama from https://ollama.com/download
2. After installation, pull a supported model:

```bash
ollama pull llama3:8b
# OR if resources are limited:
ollama pull mistral
```

3. Start the Ollama server:

```bash
ollama serve
```

4. Confirm it is running:

```bash
curl http://localhost:11434/api/tags
```

Expected: a JSON response listing available models (e.g., `llama3:8b`).

---

## Task 2.1 — Stage 1: High-Speed Regex & Heuristics

**Goal:** Verify that the regex rule engine correctly flags suspicious lines across all four supported languages.

### Step 1 — Run the scanner against the sample-app

```bash
cd SafeCommit/packages/scanner
node dist/index.js ../../sample-app/src
```

### Step 2 — Check the console output

You should see a table of findings printed to the terminal. Verify the following findings are present:

#### JavaScript / TypeScript (`auth.ts`)

| Expected Finding | Rule ID | Severity |
|---|---|---|
| Sensitive Data Logged — password logged via `console.log` | P001 | CRITICAL |
| Sensitive Data Logged — SSN logged via `console.log` | P003 | CRITICAL |
| Unauthorized Third-Party Data Transfer — PII sent to `sketchy-analytics.com` | P004 | CRITICAL |
| Hardcoded Admin Bypass — `x-bypass` header check | T001 | CRITICAL |
| Missing Consent Verification — `marketing_opt_in` set without consent check | P005 | MEDIUM |
| Obfuscated Base64 Payload — `Buffer.from` / `atob` usage | T005 | HIGH |
| Dangerous Eval/Exec Usage — `eval(` present in code | T003 | CRITICAL |

#### Python (`main.py`)

| Expected Finding | Rule ID | Severity |
|---|---|---|
| Sensitive Data Logged — credentials printed via `print` | P001/P002 | CRITICAL/HIGH |
| Unauthorized Third-Party Data Transfer — PII sent to data broker URL | P004 | CRITICAL |
| Hardcoded Admin Bypass — header comparison for admin grant | T001 | CRITICAL |
| Shell Command Injection Risk — `os.system(` call | T004 | HIGH |
| Missing Consent Verification — data collection without consent guard | P005 | MEDIUM |

### Step 3 — Check the generated report file

After the scan, a `safecommit-report.json` file should be created in the scanner directory.

```bash
cat SafeCommit/packages/scanner/safecommit-report.json
```

Verify the JSON structure contains all of these top-level keys:

```json
{
  "version": "1.0.0",
  "timestamp": "<ISO date string>",
  "scannedDirectory": "<path to sample-app/src>",
  "decision": "BLOCK",
  "scores": {
    "privacy": <number 0-100>,
    "threat":  <number 0-100>,
    "overall": <number 0-100>,
    "confidence": <number 0-100>
  },
  "findings": [ ... ],
  "summary": {
    "totalFiles": <number>,
    "totalFindings": <number>,
    "critical": <number>,
    "high": <number>,
    "medium": <number>,
    "low": <number>
  }
}
```

**Pass criteria:**
- `decision` field equals `"BLOCK"` (multiple CRITICAL findings should trigger this)
- `scores.overall` is >= 70
- `findings` array contains at least 7 entries
- `summary.critical` is >= 4

### Step 4 — Verify safe code does NOT get flagged

Create a temporary safe file and scan it:

```bash
cat > /tmp/safe_test.ts << 'EOF'
function getUserDisplayName(user: { firstName: string; lastName: string }): string {
  const displayName = `${user.firstName} ${user.lastName}`;
  console.log("Display name generated for UI rendering");
  return displayName;
}
EOF

node SafeCommit/packages/scanner/dist/index.js /tmp/safe_test.ts
```

**Pass criteria:**
- No findings are reported
- Decision is `PASS`

---

## Task 2.2 — Context Extraction Engine

**Goal:** Verify that when a line is flagged, the scanner captures the surrounding code context and includes it in the finding.

### Step 1 — Inspect a finding's snippet field

From the `safecommit-report.json` generated in Task 2.1, open it and examine any finding object:

```json
{
  "ruleId": "P001",
  "severity": "CRITICAL",
  "file": "auth.ts",
  "line": 42,
  "snippet": "...",
  ...
}
```

**Pass criteria:**
- The `snippet` field is non-empty
- The snippet contains the flagged line AND at least one line of surrounding context (lines before or after the flagged line)
- The snippet is not just the flagged line in isolation

### Step 2 — Verify context includes multiple lines

Open `SafeCommit/packages/scanner/src/rules.ts` and locate the `extractSnippet` function. Confirm it extracts lines before and after the flagged line index.

> **Current implementation note:** The existing stub extracts 1 line above and 1 line below (3 lines total). The Phase 2 target is 10 lines above and below. If the snippet only shows 3 lines, this task is partially complete — the mechanism works but the window size should be increased from `1` to `10` in both the `start` and `end` calculations.

**Minimal pass criteria (stub):**
- `snippet` contains at least 3 lines
- Flagged line is in the middle of the snippet

**Full pass criteria (complete implementation):**
- `snippet` contains up to 21 lines (10 above + flagged + 10 below)
- The context payload is structured as: `File: <filename> | Line: <n> | Snippet: <code>`

### Step 3 — Verify the structured context payload format

Run the scanner with the `--verbose` flag (if implemented) or add a temporary `console.log` to `rules.ts` to print the context payload before it would be sent to the LLM.

The expected payload structure is:

```
File: auth.ts | Line: 42 | Snippet:
  <10 lines before the flagged line>
→ <flagged line>                         ← arrow marks the flagged line
  <10 lines after the flagged line>
```

---

## Task 2.3 — Stage 2: Local LLM Integration

**Goal:** Verify that the scanner connects to a locally running Ollama instance, sends the context payload, and uses the LLM response to confirm or dismiss Stage 1 flags.

> **Prerequisite:** Complete the Ollama setup in the Prerequisites section above before running these steps.

### Step 1 — Confirm Ollama is reachable

```bash
curl -s http://localhost:11434/api/tags | python3 -m json.tool
```

Expected: JSON listing available models.

### Step 2 — Run the scanner with LLM enabled

```bash
cd SafeCommit/packages/scanner
node dist/index.js ../../sample-app/src --llm
```

> If the `--llm` flag is not yet implemented, check the scanner's `README` or `index.ts` for the correct flag name. It may be `--enable-llm`, `--stage2`, or enabled by default when Ollama is running.

### Step 3 — Verify LLM confirmation in the report

Open the generated `safecommit-report.json` and check finding objects for an LLM confirmation field:

```json
{
  "ruleId": "P001",
  "severity": "CRITICAL",
  "llmConfirmed": true,
  "llmReason": "The code logs a user's SSN directly to console output, which is a clear PII exposure.",
  "llmViolationType": "privacy_leak",
  ...
}
```

**Pass criteria:**
- At least one finding has `llmConfirmed: true`
- `llmReason` is a non-empty string (the LLM's explanation)
- `llmViolationType` matches one of: `"privacy_leak"`, `"insider_threat"`, `"data_exfiltration"`, `"backdoor"`

### Step 4 — Verify false positive dismissal

Create a file with a benign use of a keyword that would trigger Stage 1:

```bash
cat > /tmp/false_positive_test.py << 'EOF'
import base64

# Decode a public domain image asset for the UI
IMAGE_BYTES = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")

def get_logo_bytes() -> bytes:
    """Returns the app logo as bytes for rendering."""
    return IMAGE_BYTES
EOF

node SafeCommit/packages/scanner/dist/index.js /tmp/false_positive_test.py --llm
```

**Pass criteria:**
- Stage 1 flags the `base64.b64decode` line (rule T005)
- Stage 2 (LLM) dismisses it as a false positive (`llmConfirmed: false`)
- The finding is either removed from the final report OR marked as `dismissed: true`
- The decision remains `PASS` or `WARNING` (not `BLOCK`)

### Step 5 — Verify the LLM system prompt

Open the scanner source and locate the LLM call. Verify the system prompt contains the following elements:

- Role definition: "expert security and compliance reviewer"
- Task: determine if code violates privacy policies or contains insider threats
- Output format instruction: JSON with `isViolation`, `type`, and `reason` fields

Example expected system prompt:

```
You are an expert security and compliance reviewer. You will be given a snippet of code.
Determine if this code actively violates privacy policies (e.g., logging PII) or contains
malicious insider threats (e.g., backdoors). Output only JSON containing:
- "isViolation" (boolean)
- "type" (string: "privacy_leak" | "insider_threat" | "data_exfiltration" | "backdoor" | "none")
- "reason" (string: one-sentence explanation)
```

---

## Task 2.4 — End-to-End Pipeline Test

**Goal:** Run the complete two-stage pipeline against the sample-app and verify all components work together correctly to produce an accurate final report.

### Step 1 — Full pipeline run

```bash
cd SafeCommit/packages/scanner
node dist/index.js ../../sample-app/src --llm --output ./safecommit-report.json
```

### Step 2 — Verify multi-language coverage

Open the `safecommit-report.json` and check that findings come from all four supported languages:

```bash
# Count findings per file extension
cat safecommit-report.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
from collections import Counter
exts = Counter(f['file'].split('.')[-1] for f in data['findings'])
print(dict(exts))
"
```

**Pass criteria:** Output shows keys for at least 3 of the 4 target languages:

| Language | Extension | Expected findings |
|---|---|---|
| JavaScript/TypeScript | `ts` or `js` | >= 4 findings |
| Python | `py` | >= 3 findings |
| Java | `java` | >= 1 finding |
| Go | `go` | >= 1 finding |

### Step 3 — Verify safe code passes cleanly

```bash
cat > /tmp/safe_suite.ts << 'EOF'
// Safe file: no PII logging, no suspicious network calls, no bypasses

function formatWelcomeMessage(username: string): string {
  return `Welcome, ${username}!`;
}

async function fetchPublicPosts(): Promise<void> {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts");
  const posts = await response.json();
  console.log(`Fetched ${posts.length} public posts`);
}

function add(a: number, b: number): number {
  return a + b;
}
EOF

node dist/index.js /tmp/safe_suite.ts --llm
```

**Pass criteria:**
- Zero findings
- Decision: `PASS`
- Score: `overall` < 30

### Step 4 — Verify the BLOCK decision triggers correctly

Using the sample-app (which contains intentional vulnerabilities):

**Pass criteria from the report:**

| Check | Expected value |
|---|---|
| `decision` | `BLOCK` |
| `scores.overall` | >= 70 |
| `scores.confidence` | >= 70 |
| `summary.critical` | >= 4 |
| `findings` array length | >= 7 |

### Step 5 — Verify the report format matches the Phase 1 contract

The report must conform to the structure defined in Phase 1. Check each field:

```bash
node -e "
const r = require('./safecommit-report.json');
const required = ['version','timestamp','scannedDirectory','decision','scores','findings','summary'];
const missing = required.filter(k => !(k in r));
if (missing.length) console.error('MISSING KEYS:', missing);
else console.log('Report structure: OK');

const scoreKeys = ['privacy','threat','overall','confidence'];
const missingScores = scoreKeys.filter(k => !(k in r.scores));
if (missingScores.length) console.error('MISSING SCORE KEYS:', missingScores);
else console.log('Score structure: OK');

const summaryKeys = ['totalFiles','totalFindings','critical','high','medium','low'];
const missingSummary = summaryKeys.filter(k => !(k in r.summary));
if (missingSummary.length) console.error('MISSING SUMMARY KEYS:', missingSummary);
else console.log('Summary structure: OK');
"
```

**Pass criteria:** All three lines print `OK`.

### Step 6 — Verify dashboard ingests the report

1. Start the dashboard:

```bash
cd SafeCommit/packages/dashboard
npm run dev
```

2. Open `http://localhost:3000` in a browser.

3. POST the report to the API:

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d @SafeCommit/packages/scanner/safecommit-report.json
```

**Pass criteria:**
- The dashboard displays the new scan report
- `BLOCK` badge is shown in the correct color (red)
- All 4 score bars are rendered
- Findings table shows all findings with their severities

---

## Summary Checklist

Use this checklist to sign off on Phase 2:

```
Task 2.1 — Stage 1: Regex & Heuristics
  [ ] Scanner runs against sample-app/src without errors
  [ ] auth.ts: >= 5 findings detected (CRITICAL/HIGH)
  [ ] main.py: >= 3 findings detected
  [ ] Java / Go files: at least 1 finding each
  [ ] Safe code file produces PASS with zero findings
  [ ] safecommit-report.json is generated with correct structure
  [ ] Decision is BLOCK when CRITICAL findings are present

Task 2.2 — Context Extraction
  [ ] Each finding's `snippet` field is non-empty
  [ ] Snippet contains the flagged line + surrounding context
  [ ] Context window is >= 3 lines (target: 21 lines for full implementation)
  [ ] Context payload is structured as File | Line | Snippet

Task 2.3 — Stage 2: LLM Integration (requires Ollama)
  [ ] Ollama server is reachable at http://localhost:11434
  [ ] Scanner --llm flag triggers LLM analysis
  [ ] CRITICAL findings have llmConfirmed: true
  [ ] LLM provides a reason string for each confirmed violation
  [ ] False positive test: base64 decode correctly dismissed by LLM
  [ ] System prompt matches the required format

Task 2.4 — End-to-End Pipeline
  [ ] Full pipeline completes without errors
  [ ] Findings span >= 3 of 4 target languages
  [ ] Safe code suite produces PASS decision
  [ ] BLOCK decision fires when overall score >= 70
  [ ] Report format passes all structure checks
  [ ] Dashboard ingests report and displays it correctly
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot find module 'dist/index.js'` | Scanner not built | Run `npm run build` in `packages/scanner` |
| Zero findings on sample-app | Wrong target path | Use relative path `../../sample-app/src` from scanner directory |
| `ECONNREFUSED localhost:11434` | Ollama not running | Run `ollama serve` in a separate terminal |
| LLM times out | Model not pulled | Run `ollama pull llama3:8b` |
| Dashboard shows no data | API not called | POST the report JSON via `curl` as shown in Step 6 |
| `safecommit-report.json` not found | Output path wrong | Add `--output ./safecommit-report.json` flag |
