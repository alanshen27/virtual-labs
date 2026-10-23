export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMClient = {
  complete(messages: ChatMessage[]): Promise<string>;
};

export type LLMConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function readLLMConfig(env: NodeJS.ProcessEnv = process.env): LLMConfig | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const baseUrl = (env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  return { apiKey, baseUrl, model };
}

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("");
  }
  return "";
}

export function createLLMClient(config: LLMConfig): LLMClient {
  return {
    async complete(messages) {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.3,
          messages,
        }),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 180);
        throw new Error(`Model request failed (${response.status}). ${detail}`);
      }
      const payload: unknown = await response.json();
      const content =
        payload &&
        typeof payload === "object" &&
        "choices" in payload &&
        Array.isArray(payload.choices)
          ? (payload.choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content
          : undefined;
      const text = messageText(content).trim();
      if (!text) throw new Error("The model returned an empty response.");
      return text;
    },
  };
}
