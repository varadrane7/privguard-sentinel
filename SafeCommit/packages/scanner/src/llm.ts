const SYSTEM_PROMPT = `You are an expert security and compliance reviewer. You will be given a code snippet with its file name and line number. Determine if this code actively violates privacy policies (e.g., logging PII) or contains malicious insider threats (e.g., backdoors, hardcoded credentials, data exfiltration). Output ONLY a JSON object with these exact fields:
- "isViolation": boolean (true if this is a real violation, false if it is a false positive)
- "type": string (one of: "privacy_leak", "insider_threat", "data_exfiltration", "backdoor", "hardcoded_secret", "none")
- "reason": string (one sentence explaining your decision)`;

interface LLMResult {
  isViolation: boolean;
  type: string;
  reason: string;
}

export async function analyzeWithLLM(
  file: string,
  line: number,
  snippet: string,
  model = "mistral",
  ollamaUrl = "http://localhost:11434"
): Promise<LLMResult> {
  const prompt = `File: ${file} | Line: ${line}\n\nCode snippet:\n\`\`\`\n${snippet}\n\`\`\``;

  try {
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, system: SYSTEM_PROMPT, stream: false }),
    });

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);

    const data = await res.json() as { response?: string };
    const raw = data.response ?? "";

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found in LLM response");

    const parsed = JSON.parse(match[0]) as Partial<LLMResult>;
    return {
      isViolation: Boolean(parsed.isViolation),
      type: parsed.type ?? "none",
      reason: parsed.reason ?? "No reason provided",
    };
  } catch (err) {
    // Fail safe: treat as confirmed if LLM is unavailable
    return {
      isViolation: true,
      type: "unknown",
      reason: `LLM analysis unavailable: ${(err as Error).message}`,
    };
  }
}
