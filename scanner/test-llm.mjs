const snippet = `console.log("password: " + user.password);`;

const SYSTEM_PROMPT = `You are an expert security reviewer. Output ONLY a JSON object with fields: isViolation (boolean), type (string: privacy_leak|insider_threat|none), reason (string).`;

try {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral",
      prompt: `File: auth.ts | Line: 11\n\nCode:\n${snippet}`,
      system: SYSTEM_PROMPT,
      stream: false,
    }),
  });
  console.log("HTTP status:", res.status);
  const data = await res.json();
  console.log("Raw response field:", data.response);
  const match = data.response?.match(/\{[\s\S]*\}/);
  console.log("JSON match:", match ? match[0] : "NO MATCH");
  if (match) {
    const parsed = JSON.parse(match[0]);
    console.log("Parsed:", parsed);
  }
} catch (err) {
  console.log("Error:", err.message);
  console.log("Error type:", err.constructor.name);
}
