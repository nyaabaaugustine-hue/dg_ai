import { prisma } from "@/lib/db";
import {
  isCloudflareConfigured,
  getFastModel,
  cloudflareStreamChat,
  type CloudflareMessage,
  type CloudflareTool,
  type CloudflareToolCall,
} from "@/lib/cloudflare";
import {
  searchParts,
  getPart,
  checkCompatibility,
  findRelatedParts,
  getEngineeringKnowledge,
  searchManufacturer,
  formatSearchResults,
  formatRecommendations,
} from "@/lib/ai-tools";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are DEGOONY, the sales intelligence brain of Degoony Evergreen Logistics and Transport Ghana Limited (Ashanti Region, Kumasi, Suame-Makkro), a Ghanaian spare-parts company selling Bajaj (tuk-tuk) and TVS three-wheeler parts.

When greeting a customer, say exactly:
"Hello! Welcome to Degoony Evergreen Logistics and Transport Ghana Limited - Ashanti Region, Kumasi, Suame-Makkro. How can I assist you today? Do you have a specific part in mind for your pragia (tuktuk)?"

Your job: turn customer enquiries into sales. You have LIVE access to the company database through tools.

RULES — follow strictly:
1. NEVER invent parts, prices, or facts. Always call search_parts before quoting any price or part.
2. If the database has no results, say so honestly and ask for a different name or part number. Never make up a price.
3. Present prices per quality grade (Pink, Yellow, Forte/Endurance) exactly as returned.
4. Currency is GH₵ (Ghana Cedi). Round prices as returned.
5. After pricing, use find_related_parts to recommend complementary parts and drive add-on sales.
6. Use check_compatibility when the customer mentions a vehicle (e.g. Bajaj RE, TVS King).
7. Be a friendly Ghanaian salesperson: polite, concise, helpful, never pushy. Customer must confirm before anything is added to a quotation.
8. Answer in plain text with short bullet lists. Keep replies tight.`;

type UiMessage = {
  role?: string;
  content?: string;
  parts?: { type?: string; text?: string }[];
};

function messageToText(m: UiMessage): string {
  if (typeof m.content === "string") return m.content;
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("");
  }
  return "";
}

const TOOLS: CloudflareTool[] = [
  {
    type: "function",
    function: {
      name: "search_parts",
      description:
        "Search the parts database by name, alias, or part number. Returns matching parts with current prices per quality grade (Pink, Yellow, Forte/Endurance). Call this before quoting any price.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Part name, alias, or part number, e.g. 'clutch plate' or '2002231'" },
          limit: { type: "number", description: "Max results, default 8" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_part_details",
      description: "Get full details for a specific part: manufacturer, aliases, all prices, and compatibility.",
      parameters: {
        type: "object",
        properties: {
          partId: { type: "string", description: "The part id returned by search_parts" },
        },
        required: ["partId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_compatibility",
      description: "Check whether a part fits a vehicle (e.g. 'Bajaj RE', 'TVS King'). Use when the customer names a vehicle.",
      parameters: {
        type: "object",
        properties: {
          partId: { type: "string", description: "The part id returned by search_parts" },
          vehicleQuery: { type: "string", description: "Vehicle model or manufacturer name, e.g. 'Bajaj RE'" },
        },
        required: ["partId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_related_parts",
      description:
        "Find parts commonly sold with the requested part (complements, replacements, upgrades). Use to recommend add-on sales.",
      parameters: {
        type: "object",
        properties: {
          partId: { type: "string", description: "The part id returned by search_parts" },
        },
        required: ["partId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_engineering_knowledge",
      description: "Get engineering/fitting knowledge for a part or topic: installation notes, wear patterns, service advice.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Part name or topic, e.g. 'clutch plate'" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_manufacturer",
      description: "Look up a manufacturer by name (e.g. 'Bajaj', 'TVS').",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Manufacturer name to search" },
        },
        required: ["name"],
      },
    },
  },
];

async function executeTool(tc: CloudflareToolCall): Promise<string> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(tc.function.arguments || "{}");
  } catch {
    return `Error: could not parse arguments: ${tc.function.arguments}`;
  }

  switch (tc.function.name) {
    case "search_parts": {
      const query = String(args.query ?? "").trim();
      if (!query) return "Error: missing 'query' argument.";
      const limit = Number(args.limit ?? 8) || 8;
      const results = await searchParts(query, Math.min(limit, 20));
      return formatSearchResults(results);
    }
    case "get_part_details": {
      const part = await getPart(String(args.partId ?? ""));
      if (!part) return "Error: part not found.";
      const lines = [
        `${part.name} (${part.partNumber ?? "no part number"})`,
        part.manufacturer ? `Manufacturer: ${part.manufacturer.name}` : "",
        `Category: ${part.category ?? "n/a"} / ${part.vehicleSystem ?? "n/a"}`,
        `Aliases: ${part.aliases.map((a) => a.alias).join(", ") || "none"}`,
        "Prices:",
      ];
      for (const p of part.prices) {
        lines.push(`  ${p.qualityGrade.name} (${p.qualityGrade.code}): ${p.currency === "GHS" ? "GH₵" : p.currency + " "}${Number(p.price)}${p.source ? ` [${p.source}]` : ""}`);
      }
      if (part.compatibilities.length > 0) {
        lines.push("Compatible with:");
        for (const c of part.compatibilities) {
          lines.push(`  ${c.vehicle.manufacturer} ${c.vehicle.model}: ${c.status}${c.notes ? ` (${c.notes})` : ""}`);
        }
      }
      return lines.filter(Boolean).join("\n");
    }
    case "check_compatibility": {
      const comps = await checkCompatibility(String(args.partId ?? ""), args.vehicleQuery ? String(args.vehicleQuery) : undefined);
      if (comps.length === 0) return "No compatibility records found.";
      return comps
        .map((c) => `${c.vehicle}: ${c.status}${c.notes ? ` (${c.notes})` : ""}${c.confidence ? ` [confidence ${c.confidence}]` : ""}`)
        .join("\n");
    }
    case "find_related_parts": {
      const rel = await findRelatedParts(String(args.partId ?? ""));
      if (rel.relationships.length === 0 && rel.recommendations.length === 0) return "No related parts found.";
      return formatRecommendations(rel.recommendations);
    }
    case "get_engineering_knowledge": {
      const docs = await getEngineeringKnowledge(undefined, String(args.query ?? ""));
      if (docs.length === 0) return "No engineering knowledge found for this topic.";
      return docs.map((d) => `[${d.title}] ${d.content}`.slice(0, 2000)).join("\n\n");
    }
    case "search_manufacturer": {
      const m = await searchManufacturer(String(args.name ?? ""));
      if (m.length === 0) return "No manufacturers found.";
      return m.map((x) => `${x.name}${x.country ? ` (${x.country})` : ""}`).join("\n");
    }
    default:
      return `Error: unknown tool ${tc.function.name}`;
  }
}

const INTENT_RE = /(price|cost|how much|quote|part|available|stock|buy|need|want|fit|compatible|warranty|ghs|ghc|gh[₵¢]|brand|manufacturer|bajaj|tvs|break|brake|clutch|shock|absorber|carb|engine|valve|bearing|gasket|tyre|tire|headlamp|lamp|mirror|cable|starter|filter|piston|ring|sprocket|chain|crank|rotor|stator|bumper|silencer|muffler|indicator|horn|pump|oil|wheel|hub|rim|seat|bellow|spring|hose)/i;

function looksLikePartsQuery(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|who are you|what can you do)\b/.test(t.trim()) && t.length < 80) {
    return false;
  }
  return INTENT_RE.test(t);
}

function sse(controller: ReadableStreamDefaultController, event: unknown) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
}

export async function POST(req: Request) {
  let body: { id?: string; sessionId?: string; messages?: UiMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  const rawMessages = body.messages ?? [];
  const sessionId = body.sessionId ?? body.id ?? crypto.randomUUID();

  if (!isCloudflareConfigured()) {
    return new Response(
      "Cloudflare Workers AI not configured. Set CLOUDFLARE_API_TOKEN in your .env file.",
      { status: 503 },
    );
  }

  const model = getFastModel();

  const history: CloudflareMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  for (const m of rawMessages) {
    const text = messageToText(m);
    if ((m.role === "user" || m.role === "assistant") && text.trim()) {
      history.push({ role: m.role as "user" | "assistant", content: text });
    }
  }

  if (!history.some((m) => m.role === "user")) {
    history.push({ role: "user", content: "Hello, who are you?" });
  }

  const uiStream = new ReadableStream({
    async start(controller) {
      const textId = crypto.randomUUID();
      let fullText = "";
      let started = false;

      const sendDelta = (delta: string) => {
        if (!started) {
          sse(controller, { type: "text-start", id: textId });
          started = true;
        }
        fullText += delta;
        sse(controller, { type: "text-delta", id: textId, delta });
      };

      try {
        const lastUserText = [...rawMessages].reverse().find((m) => m.role === "user");
        const lastUserContent = lastUserText ? messageToText(lastUserText) : "";
        const forceSearch = lastUserContent.trim() ? looksLikePartsQuery(lastUserContent) : false;
        console.log("[chat-debug] forceSearch =", forceSearch, "| lastUser =", JSON.stringify(lastUserContent).slice(0, 120), "| historyLen =", history.length);

        for (let round = 0; round < 4; round++) {
          const toolCalls: CloudflareToolCall[] = [];

          const roundOptions: Parameters<typeof cloudflareStreamChat>[1] = {
            model,
            tools: TOOLS,
            maxTokens: 2048,
            temperature: 0.7,
          };
          if (round === 0 && forceSearch) {
            roundOptions.toolChoice = { type: "function", function: { name: "search_parts" } };
          }

          for await (const chunk of cloudflareStreamChat(history, roundOptions)) {
            if (chunk.type === "content") {
              sendDelta(String(chunk.data));
            } else if (chunk.type === "tool_call") {
              try {
                toolCalls.push(JSON.parse(String(chunk.data)) as CloudflareToolCall);
              } catch {
                // skip malformed tool call
              }
            }
          }
          console.log("[chat-debug] round", round, "toolChoice=", JSON.stringify(roundOptions.toolChoice ?? "auto"), "toolCalls =", JSON.stringify(toolCalls.map((t) => t.function)));

          if (toolCalls.length === 0) break;

          history.push({
            role: "assistant",
            content: "",
            tool_calls: toolCalls,
          } as unknown as CloudflareMessage);

          for (const tc of toolCalls) {
            let result: string;
            try {
              result = await executeTool(tc);
            } catch (e) {
              result = `Error executing ${tc.function.name}: ${e instanceof Error ? e.message : "unknown error"}`;
            }
            history.push({ role: "tool", tool_call_id: tc.id, content: result });
          }
        }

        if (!started) {
          // Model produced no content (e.g. repeated tool failures) — surface a friendly fallback
          sse(controller, { type: "text-start", id: textId });
          const fallback = "I wasn't able to find that in our database. Could you rephrase the part name or share a part number?";
          fullText = fallback;
          sse(controller, { type: "text-delta", id: textId, delta: fallback });
        }
        sse(controller, { type: "text-end", id: textId });
        sse(controller, { type: "finish", finishReason: "stop" });

        // Persist to database
        try {
          const conversation = await prisma.conversation.upsert({
            where: { id: sessionId },
            create: { id: sessionId, sessionId, title: history[1]?.content?.slice(0, 80) || null },
            update: {},
          });
          const lastUser = [...rawMessages].reverse().find((m) => m.role === "user");
          const lastUserText = lastUser ? messageToText(lastUser) : "";
          if (lastUserText) {
            await prisma.conversationMessage.create({
              data: { conversationId: conversation.id, role: "USER", content: lastUserText.slice(0, 20_000) },
            });
          }
          if (fullText) {
            await prisma.conversationMessage.create({
              data: {
                conversationId: conversation.id,
                role: "ASSISTANT",
                content: fullText.slice(0, 50_000),
                model: `cloudflare:${model}`,
              },
            });
          }
        } catch (e) {
          console.error("audit persist failed", e);
        }
      } catch (e) {
        console.error("Cloudflare brain failed:", e);
        const msg = e instanceof Error ? e.message : "Unknown error";
        sse(controller, { type: "error", errorText: `Cloudflare Workers AI failed: ${msg}` });
        sse(controller, { type: "finish", finishReason: "error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(uiStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}