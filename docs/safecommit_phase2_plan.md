# SafeCommit — Detailed Phase 2 Plan

## 1. Project Overview

*   **What we are building:** A CI/CD guardrail that statically analyzes code before deployment to detect privacy/compliance risks and malicious insider threat patterns, generating an actionable report and deciding whether to pass, warn, or block the deployment.
*   **One-line pitch:** SafeCommit catches privacy leaks and insider threats in your code *before* they ever reach production.
*   **Target users:** DevOps engineers, Security teams, Compliance officers, and fast-moving Developer teams.
*   **Real-world problem:** Modern software teams move fast. Privacy checks, compliance reviews, and security reviews often happen too late, after code is already written or deployed. Developers may accidentally introduce risky data flows (logging emails, sending location data to analytics, storing tokens, or collecting unnecessary personal data). Furthermore, there is a risk that third-party developers or rushed teams may introduce suspicious code patterns, such as hidden backdoors, obfuscated logic, hardcoded admin bypasses, or data exfiltration points.

## 2. Why this project matters

*   **Privacy-by-design:** Shifts privacy and compliance left, integrating it directly into the development lifecycle rather than acting as an afterthought.
*   **Developer workflow integration:** By living inside CI/CD, it doesn't require developers to adopt new standalone tools; feedback is delivered directly on Pull Requests.
*   **Risk before deployment:** Prevents expensive fines, data breaches, and public relations disasters by stopping bad code from being merged or deployed.
*   **Difference from normal security scanners:** Traditional SAST tools look for buffer overflows or SQL injection (vulnerabilities). SafeCommit looks for *logic risks*—code that functions perfectly but violates company privacy policies (e.g., sending PII to an unauthorized 3rd party API) or exhibits malicious intent (e.g., deliberate backdoors).

## 3. MVP Scope for 24 Hours

**Must include:**
*   Code scanner
*   Sensitive data detection
*   Third-party sharing detection
*   Consent check detection
*   Privacy risk scoring
*   Policy vs code mismatch detection
*   Insider threat detection
*   Backdoor pattern detection
*   Obfuscation detection
*   Exfiltration detection
*   Confidence score
*   PASS/WARNING/BLOCK decision
*   JSON report
*   Simple dashboard
*   GitHub Actions CI/CD integration

## 4. What NOT to build in the MVP

*   **Avoid overengineering:** Keep the architecture simple and focused on proving the core concept.
*   **Avoid full enterprise compliance system:** No complex RBAC, audit logs, or multi-tenant SSO.
*   **Avoid real legal certification:** This is a technical guardrail, not a replacement for a legal compliance team.
*   **Avoid training custom ML models:** Instead, use a two-stage detection pipeline. Stage 1 uses fast regex and heuristics to flag suspicious areas. Stage 2 takes the flagged change, function, file, and diff context, and passes it to a small, locally hosted LLM for accurate inference of compliance-breaking code.
*   **Avoid perfect static analysis:** The scanner doesn't need to handle every edge case, but it should support 4 major languages (e.g., JavaScript/TypeScript, Python, Java, and Go) to demonstrate broad applicability for the demo.

## 5. Main Features and Explanation

### Feature 1: Privacy & Sensitive Data Scanner
*   **What it does:** Scans code for handling of PII (emails, SSNs, location data) and checks if they are being logged or transmitted unsafely.
*   **Why it is important:** Prevents accidental data leaks and GDPR/CCPA violations.
*   **Example input:** `console.log("User email: " + user.email);`
*   **Example output:** Flagged: "Sensitive Data Logged" (Location: line 42, variable: user.email).
*   **Priority level:** High

### Feature 2: Third-Party Sharing & Exfiltration Detection
*   **What it does:** Analyzes outbound network requests (e.g., `fetch()`, `axios`) to identify if PII is being sent to unauthorized third-party domains.
*   **Why it is important:** Stops unauthorized data brokers, analytics trackers, or malicious exfiltration.
*   **Example input:** `axios.post('https://sketchy-analytics.com/track', { loc: user.gps });`
*   **Example output:** Flagged: "Unauthorized Third-Party Data Transfer" (Domain: sketchy-analytics.com, Data: location).
*   **Priority level:** High

### Feature 3: Insider Threat & Backdoor Detection
*   **What it does:** Looks for suspicious logic like hardcoded admin bypasses, hidden reverse shells, or obfuscated payloads.
*   **Why it is important:** Protects against disgruntled employees or compromised dependencies.
*   **Example input:** `if (req.headers['x-bypass'] === 'secret123') { return grantAdmin(); }`
*   **Example output:** Flagged: "Suspicious Admin Bypass Pattern" (Severity: CRITICAL).
*   **Priority level:** High

### Feature 4: Consent Check Detection
*   **What it does:** Verifies that functions collecting sensitive data are preceded by a check for user consent.
*   **Why it is important:** Enforces privacy-by-design principles in code.
*   **Example input:** `db.users.update(id, { marketing_opt_in: true })` without a corresponding UI consent check.
*   **Example output:** Warning: "Missing Consent Verification for Data Collection".
*   **Priority level:** Medium

### Feature 5: Risk Scoring & Decision Engine
*   **What it does:** Aggregates findings to calculate risk scores and makes a PASS/WARNING/BLOCK deployment decision.
*   **Why it is important:** Provides actionable outcomes for the CI/CD pipeline rather than just a list of alerts.
*   **Example input:** 1 Critical Backdoor, 2 Privacy Warnings.
*   **Example output:** Overall Risk: 95/100. Decision: BLOCK.
*   **Priority level:** High

## 6. System Architecture

**The workflow is as follows:**

Developer PR → GitHub Action → Scanner → Rule engine → Risk scoring → Report → Dashboard → Deployment decision

1.  **Developer PR:** A developer pushes code or opens a Pull Request on GitHub.
2.  **GitHub Action:** The PR triggers a GitHub Action workflow which acts as the runner.
3.  **Scanner:** The Action executes the SafeCommit CLI/script over the changed files (using `git diff` or full directory scan).
4.  **Rule Engine:** The code is parsed (via AST or Regex) and evaluated against privacy and threat rules.
5.  **Risk Scoring:** Findings are weighted to calculate Privacy, Insider Threat, Overall, and Confidence scores.
6.  **Report:** A structured JSON report is generated containing the findings, scores, and explanations.
7.  **Dashboard:** A beautiful web UI built with Next.js, Tailwind CSS, and SQLite (via Prisma) to store and display the contents of the generated JSON reports.
8.  **Deployment Decision:** The GitHub Action reads the risk score. If the decision is BLOCK, the Action fails, preventing the PR from being merged.

---

## 7. Phase 2: Core Scanner Logic (Hours 5-12)
*Goal: Build the two-stage detection engine utilizing high-speed regex filters followed by intelligent, locally-hosted LLM inference.*

### Task 2.1: Implement Stage 1 (High-Speed Regex & Heuristics)
*   **Action:** Build the initial fast-pass filter to catch suspicious keywords across all scanned files.
*   **Details:**
    *   **Privacy Rules:** Create regex patterns looking for `console.log`, `print`, `logger.info` occurring near keywords like `email`, `ssn`, `password`, `credit_card`.
    *   **Network Rules:** Create regex patterns looking for `fetch(`, `axios.`, `requests.post(`, `http.Post(` to identify potential exfiltration or third-party sharing.
    *   **Threat Rules:** Create patterns for `base64`, `eval(`, `exec(`, or comparisons involving `admin` and `headers`.
*   **Outcome:** A blazing fast script that iterates over thousands of lines of code and returns an array of "suspicious lines" and their line numbers.

### Task 2.2: Context Extraction Engine
*   **Action:** Write logic to extract the surrounding context of a flagged line to feed to the LLM.
*   **Details:**
    *   When a line is flagged in Stage 1, the scanner must extract the code block around it (e.g., 10 lines above and 10 lines below).
    *   *Stretch Goal:* Use a lightweight AST parser (like `tree-sitter`) to extract the exact function body where the flagged line lives, rather than arbitrary line counts.
    *   Format this context clearly: `File: auth.ts | Function: login() | Flagged Line: 42`.
*   **Outcome:** A structured "Context Payload" ready to be sent to the LLM for deep analysis.

### Task 2.3: Stage 2 (Local LLM Integration)
*   **Action:** Connect the scanner to a local LLM to infer actual compliance breaches vs. false positives.
*   **Details:**
    *   Host a small, fast model locally (e.g., `llama3:8b` or `mistral` via Ollama).
    *   Write the system prompt: *"You are an expert security and compliance reviewer. You will be given a snippet of code. Determine if this code actively violates privacy policies (e.g., logging PII) or contains malicious insider threats (e.g., backdoors). Output only JSON containing 'isViolation' (boolean), 'type', and 'reason'."*
    *   In the Node.js scanner, use `fetch()` to send the Context Payload (from 2.2) to `http://localhost:11434/api/generate` (Ollama default port).
    *   Parse the JSON response to definitively confirm or reject the Stage 1 flag.
*   **Outcome:** A highly intelligent scanner that drastically reduces false positives by understanding the *intent* of the code.

### Task 2.4: Consolidate and Test the Engine
*   **Action:** Run the two-stage pipeline against the `sample-app` created in Phase 1.
*   **Details:**
    *   Execute the CLI command on the `sample-app/src` directory.
    *   Verify that safe code (e.g., logging generic app state) passes Stage 1, or is flagged by Stage 1 but correctly dismissed by Stage 2.
    *   Verify that intentional vulnerabilities (e.g., logging SSNs, backdoors in Python/Go) are confirmed by the LLM and categorized accurately.
    *   Output the confirmed findings into the `safecommit-report.json` format defined in Phase 1.
*   **Outcome:** A fully functioning, end-to-end local scanner that correctly identifies logic flaws across JS, Python, Java, and Go.
