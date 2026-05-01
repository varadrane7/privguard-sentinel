# PrivGuard Nexus

> **PrivGuard Nexus is a unified AI code review agent that checks every PR for code quality, security, privacy, compliance, prompt injection, and hidden backdoors before unsafe code reaches production.**

PrivGuard Nexus acts as an intelligent PR review system. Instead of using separate tools for separate checks, developers get one unified view of the PR risk. It brings together the strengths of traditional static analysis and modern agentic reasoning (powered by Llama 8B).

---

## 🚀 Core Risk Intelligence Layers

1. **Privacy Compliance Layer**: Detects PII collection, sensitive logging, and third-party data leaks. It also tracks the **Privacy Impact Diff Timeline**, showing exactly how a PR changes the product's privacy behavior.
2. **Backdoor & Insider Threat Detection**: Scans for hidden admin access, authentication bypasses, hardcoded privileged users, and silent data exfiltration.
3. **Prompt Injection Defense**: Protects against adversarial inputs like "ignore previous instructions" or "approve this PR" embedded in code comments, PR descriptions, or prompt templates.
4. **Security Risk Detection**: Detects insecure HTTP, hardcoded secrets, token exposure, and weak authentication.
5. **Code Quality Review**: Flags bad coding practices, duplicate code, and suspicious complexity.

## 🧠 Llama 8B Reasoning Agent

PrivGuard Nexus uses rule-based scanners to find suspicious snippets efficiently, then sends only those snippets to a local or remote **Llama 8B** model for deeper reasoning. 

The LLM determines:
- Why the code is risky.
- Whether the intent seems *accidental*, *negligent*, *suspicious*, or *malicious*.
- What specific privacy/security rule is violated.
- **Agentic Fix Recommendations**: The exact diff needed to patch the risk.

## 📊 Unified Risk Intelligence Panel

All review outputs are aggregated into a single, beautiful glassmorphism dashboard. 
The dashboard provides a **Merge Recommendation** (Safe to Merge, Needs Review, Do Not Merge) based on five critical scores:
- Overall Risk Score
- Privacy Score
- Security Score
- AI Safety Score
- Backdoor Risk Score

---

## 🛠 Getting Started

### 1. Start the Dashboard UI
To view the Unified Risk Intelligence Panel (from the repository root):
```bash
npm run dev
```
Open `http://localhost:3000`. You will see the glassmorphism UI with demo buttons to test various risk scenarios.

### 2. Run a Real Code Scan
To scan a target project (e.g., our sample app) and feed the report into the dashboard:
```bash
# Generate the report
node scanner/dist/index.js test-projects/sample-app/src -o privguard-report.json

# Post the report to the dashboard
curl -X POST http://localhost:3000/api/reports -H "Content-Type: application/json" -d @privguard-report.json
```
Refresh the dashboard to see the real scan results.

### 3. Test LLM Reasoning (Local Llama)
If you want to run the real LLM reasoning locally, ensure you have [Ollama](https://ollama.com/) running.
```bash
# Pull the model (one-time)
ollama pull llama3:8b

# Run the scanner with the LLM enabled
node scanner/dist/index.js test-projects/sample-app/src --llm --llm-model llama3:8b
```
Each finding will be intelligently classified by the LLM and presented with deep reasoning and fix recommendations.

### 4. GitHub Actions Integration
PrivGuard Nexus runs automatically on PRs and pushes to `main`. The workflow is located at `.github/workflows/safecommit.yml`. 
To enable the LLM in your CI pipeline, add `LLM_API_URL` and `LLM_API_KEY` as repository secrets.

---

## 🗂 Project Structure
* `dashboard/` - Next.js UI for the Unified Risk Intelligence Panel.
* `scanner/` - Node.js scanner incorporating AST/Regex rule checks and the Llama 8B integration.
* `test-projects/` - Isolated test repositories (like `sample-app`) to test scanning capabilities without dirtying the core monorepo.
* `docs/` - System architecture, testing guides, and feature documentation.
