# SafeCommit — Hackathon Task List & Timeline

This task list is optimized for a 24-hour hackathon, breaking the project down into manageable, prioritized chunks to ensure a functional MVP and a compelling demo.

## Phase 1: Setup & Skeleton (Hours 1-4)
**Goal: Get the basic infrastructure running.**

*   [ ] **Task 1.1:** Initialize the monorepo or project structure (e.g., `packages/scanner`, `packages/dashboard`, `packages/sample-app`).
*   [ ] **Task 1.2:** Create the `sample-app` (a basic Node.js/Express or Python app) with a few standard API routes.
*   [ ] **Task 1.3:** Setup the base CLI script for `safecommit` that can accept a directory path as an argument.
*   [ ] **Task 1.4:** Establish the `safecommit-report.json` schema (how findings, scores, and decisions will be structured).
*   [ ] **Task 1.5:** Initialize a Next.js app with Tailwind CSS and an SQLite database (via Prisma) for the dashboard, and ensure it can ingest the local `safecommit-report.json` file.

## Phase 2: Core Scanner Logic (Hours 5-12)
**Goal: Build the detection engines using Regex/AST.**

*   [ ] **Task 2.1:** Implement the file reader logic to iterate over `.js`, `.ts`, or `.py` files in the target directory.
*   [ ] **Task 2.2:** Build **Privacy Rule 1 (PII Logging):** Detect `console.log`, `logger.info`, etc., being called with variable names like `email`, `password`, `ssn`.
*   [ ] **Task 2.3:** Build **Privacy Rule 2 (Third-Party Sharing):** Detect `fetch` or `axios` calls to non-allowlisted domains.
*   [ ] **Task 2.4:** Build **Threat Rule 1 (Hardcoded Bypass):** Detect string comparisons with sensitive headers (e.g., `x-bypass`, `admin==true`).
*   [ ] **Task 2.5:** Build **Threat Rule 2 (Obfuscation):** Detect base64 encoding strings or `eval()` calls that look suspicious.
*   [ ] **Task 2.6:** Inject intentional vulnerabilities into `sample-app` to test the rules (Act 2 and Act 3 scenarios from the Demo Plan).

## Phase 3: Risk Scoring & Reporting (Hours 13-16)
**Goal: Process findings into a final decision.**

*   [ ] **Task 3.1:** Implement the `RiskEngine`. Assign point values to each type of finding (e.g., Logging = 20 pts, Backdoor = 100 pts).
*   [ ] **Task 3.2:** Implement the calculation for `Privacy Risk Score` and `Insider Threat Score`.
*   [ ] **Task 3.3:** Implement the PASS/WARNING/BLOCK logic (e.g., Total Score > 80 = BLOCK, > 40 = WARNING).
*   [ ] **Task 3.4:** Write the aggregated results, including snippets of the flagged code and suggested fixes, into `safecommit-report.json`.

## Phase 4: CI/CD Integration (Hours 17-19)
**Goal: Prove it works in a real developer workflow.**

*   [ ] **Task 4.1:** Create a `.github/workflows/safecommit.yml` file in the `sample-app`.
*   [ ] **Task 4.2:** Configure the action to trigger on Pull Requests.
*   [ ] **Task 4.3:** Have the Action run the `safecommit` script.
*   [ ] **Task 4.4:** Parse the output decision; if BLOCK, exit with code 1 to fail the GitHub check. If PASS/WARNING, exit with 0.

## Phase 5: Dashboard UI & Polish (Hours 20-22)
**Goal: Make it look amazing for the judges.**

*   [ ] **Task 5.1:** Design a sleek, dark-mode dashboard using Next.js and Tailwind CSS.
*   [ ] **Task 5.2:** Build the top-level summary components (Large PASS/BLOCK badge, Risk Score donut charts).
*   [ ] **Task 5.3:** Build the "Findings Table" displaying the flagged file, line number, issue type, and confidence.
*   [ ] **Task 5.4:** Add an "Explanation & Fix" drawer/modal that shows why the code was flagged and how to fix it.

## Phase 6: Demo Prep & Buffer (Hours 23-24)
**Goal: Ensure a flawless presentation.**

*   [ ] **Task 6.1:** Run through the 3-act demo scenario end-to-end locally.
*   [ ] **Task 6.2:** Fix any edge cases where the scanner breaks or the UI looks misaligned.
*   [ ] **Task 6.3:** Write a script for the presentation.
*   [ ] **Task 6.4:** Record a backup video of the demo working perfectly just in case live internet fails.
