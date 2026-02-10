type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function env(name: string, fallback?: string) {
  return process.env[name] ?? fallback;
}

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function chatCompletion(messages: ChatMessage[], opts?: { temperature?: number }) {
  const provider = env("LLM_PROVIDER", "ollama");

  if (provider === "ollama") {
    const baseUrl = requiredEnv("LLM_BASE_URL");
    const model = requiredEnv("LLM_MODEL");

    // juntamos system + user num prompt único
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const user = messages.filter((m) => m.role !== "system").map((m) => m.content).join("\n\n");

    const prompt = `${system}\n\n${user}\n\nResponde apenas com JSON válido.`;

    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        temperature: opts?.temperature ?? 0.4,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Ollama error ${res.status}: ${txt}`);
    }

    const data = await res.json();
    const content = data?.response;
    if (!content) throw new Error("Ollama returned empty response");
    return content as string;
  }

  // OpenAI / OpenRouter compatible
  const apiKey = requiredEnv("LLM_API_KEY");
  const baseUrl = requiredEnv("LLM_BASE_URL");
  const model = requiredEnv("LLM_MODEL");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.4,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`LLM error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty content");
  return content as string;
}
