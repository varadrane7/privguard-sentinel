# SafeCommit — Detailed Phase 1 Plan

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

## 7. Phase 1: Deep Dive Task Breakdown (Hours 1-4)
*Goal: Establish the core monorepo architecture, testing grounds, and structural foundations across all languages and frameworks.*

### Task 1.1: Initialize the Monorepo Structure
*   **Action:** Create a unified directory to hold all components of the hackathon project.
*   **Details:**
    *   Initialize a `package.json` at the root for workspace management (using npm workspaces or pnpm).
    *   Create `packages/scanner` (Node.js CLI tool).
    *   Create `packages/dashboard` (Next.js application).
    *   Create `packages/sample-app` (Testing ground containing mock code).
*   **Outcome:** A structured, manageable codebase where the scanner and dashboard can be developed concurrently.

### Task 1.2: Build the Multi-Language `sample-app`
*   **Action:** Create realistic mock files to act as the test subject for the scanner.
*   **Details:**
    *   **JavaScript/TypeScript:** Create an Express.js route (`auth.ts`) containing a fake login with intentional `console.log(password)` and `fetch('unauthorized-tracker.com')` logic.
    *   **Python:** Create a FastAPI or Flask route (`main.py`) containing a simulated backdoor (`if request.headers.get("X-Bypass") == "true": return admin`).
    *   **Java:** Create a Spring Boot controller (`UserController.java`) that leaks PII in a logger (`logger.info("User SSN: " + user.getSsn())`).
    *   **Go:** Create a standard `net/http` handler (`handler.go`) demonstrating an obfuscated string or suspicious eval-like execution.
*   **Outcome:** A robust suite of intentionally vulnerable files across the 4 major languages to guarantee the scanner works universally.

### Task 1.3: Develop the Base `safecommit` CLI Script
*   **Action:** Scaffold the actual executable that will run in CI/CD.
*   **Details:**
    *   In `packages/scanner`, set up a basic Node.js executable using `commander` or raw `process.argv`.
    *   Implement file traversal: write a recursive function that reads a target directory and returns an array of file paths ending in `.js`, `.ts`, `.py`, `.java`, and `.go`.
    *   Implement file reading: load the raw text content of these files into memory for the rules engine to process.
    *   Set up dummy rule processing that just prints "Scanning file: X..." for now.
*   **Outcome:** A working CLI command (e.g., `npx safecommit ./src`) that successfully targets and reads multi-language files.

### Task 1.4: Design the `safecommit-report.json` Schema
*   **Action:** Define the exact contract between the Scanner and the Dashboard.
*   **Details:**
    *   Create a TypeScript interface or JSON schema defining the output.
    *   Must include: `overallDecision` ("PASS" | "WARNING" | "BLOCK").
    *   Must include: `scores` object (`privacy`, `threat`, `overall`).
    *   Must include: `findings` array. Each finding needs:
        *   `id` (unique identifier).
        *   `type` ("privacy" | "threat").
        *   `file` (path to file).
        *   `line` (line number of issue).
        *   `snippet` (the exact bad code).
        *   `ruleTriggered` (e.g., "Hardcoded Admin Bypass").
        *   `recommendation` (how to fix it).
*   **Outcome:** A strictly typed JSON structure that the frontend can confidently rely on to build charts and tables.

### Task 1.5: Scaffold the Next.js Dashboard & Database
*   **Action:** Initialize the frontend and prepare the database connection.
*   **Details:**
    *   Run `npx create-next-app@latest packages/dashboard` using App Router and Tailwind CSS.
    *   Initialize Prisma (`npx prisma init --datasource-provider sqlite`).
    *   Define the Prisma schema: A `Report` model and a one-to-many `Finding` model mapped to the JSON schema from Task 1.4.
    *   Run `npx prisma db push` to generate the local `.db` file.
    *   Create a basic API route (`/api/reports`) to POST a JSON report and save it to SQLite.
*   **Outcome:** A running Next.js app with a configured SQLite database ready to ingest scanner results.
