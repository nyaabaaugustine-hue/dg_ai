/**
 * Cloudflare Workers AI client for DEGOONY Intelligence Bot.
 *
 * Supports:
 * - gpt-oss-120b (thinking brain — complex reasoning, multi-step)
 * - llama-3.3-70b-versatile-turbo (fast brain — greetings, FAQs, simple queries)
 * - Function calling / tool use
 * - Streaming responses
 */

export type CloudflareMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: CloudflareToolCall[];
  name?: string;
};

export type CloudflareToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type CloudflareTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

export type CloudflareChatResponse = {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: CloudflareToolCall[];
    };
    finish_reason: string;
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type CloudflareStreamChunk = {
  id: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: {
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }[];
    };
    finish_reason: string | null;
  }[];
};

type CloudflareConfig = {
  accountId: string;
  apiToken: string;
  model?: string;
  thinkingModel?: string;
};

function getConfig(): CloudflareConfig {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in .env");
  }
  return {
    accountId,
    apiToken,
    model: process.env.CLOUDFLARE_FAST_MODEL?.trim() || "@cf/meta/llama-4-scout-17b-16e-instruct",
    thinkingModel: process.env.CLOUDFLARE_THINKING_MODEL?.trim() || "@cf/openai/gpt-oss-120b",
  };
}

/**
 * Send a chat completion request to Cloudflare Workers AI (non-streaming).
 */
export async function cloudflareChat(
  messages: CloudflareMessage[],
  options?: {
    model?: string;
    tools?: CloudflareTool[];
    maxTokens?: number;
    temperature?: number;
  },
): Promise<CloudflareChatResponse> {
  const config = getConfig();
  const model = options?.model || config.thinkingModel;

  const body: Record<string, unknown> = {
    messages,
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature ?? 0.7,
  };

  if (options?.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = "auto";
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/${model}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare API error ${res.status}: ${text}`);
  }

  const raw = (await res.json()) as { result?: CloudflareChatResponse } & CloudflareChatResponse;
  const json = raw.result ?? raw;
  return json;
}

/**
 * Stream a chat completion from Cloudflare Workers AI.
 * Returns an async iterator of content chunks.
 */
export async function* cloudflareStreamChat(
  messages: CloudflareMessage[],
  options?: {
    model?: string;
    tools?: CloudflareTool[];
    toolChoice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
    maxTokens?: number;
    temperature?: number;
  },
): AsyncGenerator<{ type: "content" | "tool_call" | "done"; data: string | CloudflareToolCall }, void, unknown> {
  const config = getConfig();
  const model = options?.model || config.model;

  const body: Record<string, unknown> = {
    messages,
    max_tokens: options?.maxTokens || 4096,
    temperature: options?.temperature ?? 0.7,
    stream: true,
  };

  if (options?.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options?.toolChoice ?? "auto";
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/${model}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare API error ${res.status}: ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  // Track accumulated tool calls
  const toolCallAccumulator: Map<number, { id: string; name: string; arguments: string }> = new Map();
  // Some Cloudflare models close the stream without ever sending "[DONE]";
  // without a final flush their tool calls would be silently dropped and the
  // model would answer without database data.
  let toolCallsFlushed = false;
  const knownToolNames = (options?.tools ?? []).map((t) => t.function.name);
  const flushToolCalls = (): { type: "tool_call"; data: string }[] => {
    if (toolCallsFlushed) return [];
    toolCallsFlushed = true;
    const out: { type: "tool_call"; data: string }[] = [];
    for (const [, tc] of toolCallAccumulator) {
      // Repair duplicated names ("search_partssearch_parts") from providers
      // that resend the full name on every chunk instead of appending deltas.
      let name = tc.name;
      for (const known of knownToolNames) {
        if (name.startsWith(known)) {
          name = known;
          break;
        }
      }
      if (!name || !tc.arguments.trim()) continue;
      out.push({
        type: "tool_call",
        data: JSON.stringify({
          id: tc.id || `call_${name}_${out.length}`,
          type: "function",
          function: { name, arguments: tc.arguments },
        }),
      });
    }
    return out;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          for (const ev of flushToolCalls()) yield ev;
          yield { type: "done", data: "" };
          return;
        }

        try {
          const parsed = JSON.parse(data) as CloudflareStreamChunk;
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;
          if (!delta && choice.finish_reason === "tool_calls") {
            for (const ev of flushToolCalls()) yield ev;
            continue;
          }

          // Content chunk
          if (delta?.content) {
            yield { type: "content", data: delta.content };
          }

          // Tool call chunk
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallAccumulator.has(idx)) {
                toolCallAccumulator.set(idx, { id: "", name: "", arguments: "" });
              }
              const acc = toolCallAccumulator.get(idx)!;
              if (tc.id) acc.id = tc.id;
              if (tc.function?.name) acc.name += tc.function.name;
              if (tc.function?.arguments) acc.arguments += tc.function.arguments;
            }
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Stream closed without "[DONE]" — still deliver any accumulated tool calls.
  for (const ev of flushToolCalls()) yield ev;
  yield { type: "done", data: "" };
}

/**
 * Convert our internal message format to Cloudflare format.
 */
export function toCloudflareMessages(
  messages: { role: string; content: string }[],
  systemPrompt: string,
): CloudflareMessage[] {
  const out: CloudflareMessage[] = [
    { role: "system", content: systemPrompt },
  ];
  for (const m of messages) {
    if (m.role === "user" || m.role === "assistant") {
      out.push({ role: m.role as "user" | "assistant", content: m.content });
    }
  }
  return out;
}

/**
 * Check if Cloudflare is configured and healthy.
 */
export function isCloudflareConfigured(): boolean {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  return !!(accountId && apiToken && apiToken !== "PASTE_YOUR_TOKEN_HERE");
}

/**
 * Get the fast brain model name.
 */
export function getFastModel(): string {
  return getConfig().model || "@cf/meta/llama-4-scout-17b-16e-instruct";
}

/**
 * Get the thinking brain model name.
 */
export function getThinkingModel(): string {
  return getConfig().thinkingModel || "@cf/openai/gpt-oss-120b";
}
