# SafeCommit — Implementation Plan

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
*   **Avoid complex ML models:** Use AST parsing, regex, and simple heuristics (or lightweight LLM API calls) instead of training custom machine learning models.
*   **Avoid perfect static analysis:** The scanner doesn't need to handle every edge case or programming language; supporting a single primary language (e.g., JavaScript/TypeScript or Python) is sufficient for the demo.

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
7.  **Dashboard:** The JSON report is served to a simple web dashboard (React/Next.js or static HTML) to visualize the risks.
8.  **Deployment Decision:** The GitHub Action reads the risk score. If the decision is BLOCK, the Action fails, preventing the PR from being merged.

## 7. Modules to Build

1.  **sample-app:** A dummy application (e.g., an Express.js or Python API) containing intentional safe, risky, and malicious code to scan during the demo.
2.  **privacy scanner:** The detection logic for PII, logging, third-party sharing, and consent checks.
3.  **insider threat scanner:** The detection logic for backdoors, obfuscation, and exfiltration.
4.  **rules engine:** The core logic that orchestrates the scanners, manages policies, and processes the raw code.
5.  **explanation engine:** A module that maps flagged rules to human-readable explanations and suggested fixes (can optionally use an LLM API).
6.  **report generator:** Compiles the output from the engines into the final `safecommit-report.json`.
7.  **dashboard:** A beautiful web UI built with Next.js, Tailwind CSS, and SQLite (via Prisma) to store and display the contents of the generated JSON reports.
8.  **GitHub Action:** The `.github/workflows/safecommit.yml` file and shell script to run the scanner in CI.

## 8. Risk Scoring Plan

The system will output a calculated score based on findings.

*   **Privacy Risk Score:** 0-100 (Based on PII leaks, unauthorized sharing).
*   **Insider Threat Score:** 0-100 (Based on backdoors, obfuscation).
*   **Overall Risk Score:** The highest of the two sub-scores, or a weighted average.
*   **Confidence Score:** 0-100% (How certain the scanner is about the findings, based on regex/AST accuracy).
*   **Classification:**
    *   **Likely Accidental:** (e.g., `console.log(user)`) -> Triggers a WARNING.
    *   **Suspicious Needs Review:** (e.g., unverified third-party fetch) -> Triggers a WARNING or BLOCK depending on policy.
    *   **Likely Malicious:** (e.g., hardcoded admin bypass) -> Triggers a BLOCK.

## 9. Demo Scenario

**Storyline for the final presentation:**

1.  **Introduction (1 min):** Explain the problem—security catches SQLi, but who catches a developer logging SSNs or a disgruntled contractor leaving a backdoor?
2.  **Act 1: The Safe Code (1 min):** We show a standard PR. SafeCommit runs via GitHub Actions, gives a PASS, and merges perfectly.
3.  **Act 2: The Sloppy Developer (1.5 mins):** A developer pushes code that accidentally logs an email address and sends location data to an unapproved analytics tracker without a consent check.
    *   SafeCommit runs.
    *   It identifies the PII and third-party risk.
    *   It flags it as "Likely Accidental" and assigns a WARNING (or BLOCK).
4.  **Act 3: The Insider Threat (1.5 mins):** A disgruntled developer tries to sneak in a hidden admin bypass (`if header == 'xyz' return admin`).
    *   SafeCommit runs.
    *   It flags the backdoor pattern.
    *   It classifies it as "Likely Malicious", assigns a high risk score, and issues a hard BLOCK on the deployment.
5.  **Act 4: The Dashboard (1 min):** We open the SafeCommit Dashboard to review the generated JSON report. It shows beautiful visualizations of the risk score, the evidence (lines of code), and actionable fix suggestions.
