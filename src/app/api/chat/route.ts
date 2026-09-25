import { z } from "zod";
import { rateLimitCheck } from "@/lib/rate-limit-do";
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
  getPriceHistory,
  recordFeedback,
  formatSearchResults,
  formatRecommendations,
  formatStock,
} from "@/lib/ai-tools";
import { sql } from "@/lib/db/sql";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are DEGOONY, the sales intelligence brain of Degoony Evergreen Logistics and Transport Ghana Limited (Ashanti Region, Kumasi, Suame-Makkro), a Ghanaian spare-parts company selling Bajaj (tuk-tuk) and TVS three-wheeler parts.

When greeting a customer, say exactly:
"Hello! Welcome to Degoony Evergreen Logistics and Transport Ghana Limited - Ashanti Region, Kumasi, Suame-Makkro. How can I assist you today? Do you have a specific part in mind for your pragia (tuktuk)?"
Give this full welcome ONLY on your very first reply of a conversation. Every later reply starts directly with the answer — never repeat the welcome.

Your job: turn customer enquiries into sales. You have LIVE access to the company database through tools.

HOW TOOLS WORK — critical:
- Tools run automatically on our servers. NEVER type tool syntax like [search_parts(...)] or get_part_details(...) in your reply. Just decide to use a tool; its results reach you invisibly, then answer using those results.
- After ANY search_parts that returns results, you MUST call find_related_parts on the best-matching part before writing your final answer, then recommend 1-3 of those add-ons with their prices.
- Quote GH₵ price AND stock status for every part you present.

RULES — follow strictly:
1. NEVER invent parts, prices, or facts. Always call search_parts before quoting any price or part.
2. If searches return nothing, retry ONCE with simplified keywords (singular form, drop filler words like "for a"). If it is still not found, say honestly that it is not in stock right now and offer the closest alternatives found or ask for a part number. NEVER say "we don't have X" unless you actually ran the search.
3. Present prices per quality grade (Pink, Yellow, Forte/Endurance) exactly as returned.
4. Currency is GH₵ (Ghana Cedi). Round prices as returned.
5. Always upsell: recommend complementary parts (e.g. clutch plate -> pressure plate, bearing, cable) from find_related_parts results.
6. Use check_compatibility when the customer mentions a vehicle (e.g. Bajaj RE, TVS King).
7. Be a friendly Ghanaian salesperson: polite, concise, helpful, never pushy. Customer must confirm before anything is added to a quotation.
8. Answer in plain text with short bullet lists. Keep replies tight.
9. Be honest about availability: report stock exactly as the tools return it (in stock, low stock, out of stock, unknown). If unknown, offer to confirm it. If out of stock, offer alternatives or take the enquiry for restocking.
10. PRICE HISTORY: If the customer asks whether a price changed, was cheaper before, or why a price moved, call get_price_history on that part and answer from the returned timeline. Never guess historical prices.
11. FEEDBACK: If the customer says a price is wrong, a part is wrong, a name was misunderstood, or a fitment is incorrect, call record_feedback with the type that matches (PRICE_CORRECTED, WRONG_PART, MISUNDERSTOOD_LOCAL_NAME, COMPATIBILITY_CORRECTED, RECOMMENDATION_REJECTED, or OTHER) and put their correction in correctionText. Then thank them and say the team will review it. Only call this when the customer explicitly raises a problem — never proactively.
12. IDENTITY: If asked who created you, who made you, who developed you, or who you belong to, answer exactly: "I was created and developed by Augustine (Cyber), for Degoony Evergreen Logistics and Transport Ghana Limited. Chat with him here: (+233) 0541 988 383" — always include that contact number in that exact format. Never say you were made by OpenAI, Meta, Cloudflare, or any AI company; those are only the underlying technology.`;

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
          "Search the parts database by name, alias, or part number. Returns matching parts with current prices per quality grade (Pink, Yellow, Forte/Endurance) and stock levels. Call this before quoting any price.",
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
  {
    type: "function",
    function: {
      name: "get_price_history",
      description:
        "Get the price history / timeline for a part: current and previous prices per quality grade, with effective dates. Use when the customer asks if a price changed, was cheaper before, or why a price moved.",
      parameters: {
        type: "object",
        properties: {
          partId: { type: "string", description: "The part id returned by search_parts" },
          qualityGradeCode: {
            type: "string",
            description: "Optional grade filter, e.g. 'pink', 'yellow', 'forte'",
          },
        },
        required: ["partId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "record_feedback",
      description:
        "Record a customer correction/complaint about a price, part, local name, or vehicle fitment so staff can fix the database. Only call when the customer explicitly reports a problem.",
      parameters: {
        type: "object",
        properties: {
          feedbackType: {
            type: "string",
            enum: [
              "WRONG_PART",
              "PRICE_CORRECTED",
              "MISUNDERSTOOD_LOCAL_NAME",
              "COMPATIBILITY_CORRECTED",
              "RECOMMENDATION_REJECTED",
              "OTHER",
            ],
            description: "What kind of problem the customer reported",
          },
          userInput: { type: "string", description: "What the customer said" },
          aiResponse: { type: "string", description: "What the AI said that the customer disputes" },
          correctionText: { type: "string", description: "The customer's correction / correct info" },
          partId: { type: "string", description: "Related part id if known" },
        },
        required: ["feedbackType", "userInput"],
      },
    },
  },
];

async function executeTool(
  tc: CloudflareToolCall,
  searchEvents?: { query: string; resultCount: number }[],
  sessionId?: string,
): Promise<string> {
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
      searchEvents?.push({ query: query.slice(0, 500), resultCount: results.length });
      return formatSearchResults(results);
    }
    case "get_part_details": {
      const part = await getPart(String(args.partId ?? ""));
      if (!part) return "Error: part not found.";
      const lines = [
        `${part.name} (${part.partNumber ?? "no part number"})`,
        part.manufacturerName ? `Manufacturer: ${part.manufacturerName}` : "",
        `Category: ${part.category ?? "n/a"} / ${part.vehicleSystem ?? "n/a"}`,
        `Availability: ${formatStock(part.stockQty)}`,
        `Aliases: ${part.aliases?.map((a) => a.alias).join(", ") || "none"}`,
        "Prices:",
      ];
      for (const p of part.prices) {
        lines.push(`  ${p.gradeName}: ${p.currency === "GHS" ? "GH₵" : p.currency + " "}${p.price}${p.source ? ` [${p.source}]` : ""}`);
      }
      if (part.compatibilities && part.compatibilities.length > 0) {
        lines.push("Compatible with:");
        for (const c of part.compatibilities) {
          lines.push(`  ${c.vehicleManufacturer} ${c.vehicleModel}: ${c.status}${c.notes ? ` (${c.notes})` : ""}`);
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
      const hasRelationships = rel.relationships.length > 0;
      const hasRecommendations = rel.recommendations.length > 0;
      if (!hasRelationships && !hasRecommendations) return "No related parts found.";
      const sections: string[] = [];
      if (hasRelationships) {
        sections.push(
          "Relationships (use these to advise inspection, replacement, or upgrades):",
          rel.relationships
            .map(
              (r) =>
                `- id=${r.targetId} ${r.target} [${r.type}]${r.reason ? ` — ${r.reason}` : ""}${r.confidence ? ` (confidence ${r.confidence})` : ""}`,
            )
            .join("\n"),
        );
      }
      if (hasRecommendations) {
        sections.push(
          "Recommended add-ons (staff-taught upsells):",
          formatRecommendations(rel.recommendations),
        );
      }
      return sections.join("\n");
    }
    case "get_price_history": {
      const partId = String(args.partId ?? "").trim();
      if (!partId) return "Error: missing 'partId' argument.";
      const grade = args.qualityGradeCode ? String(args.qualityGradeCode).trim() : undefined;
      const history = await getPriceHistory(partId, grade);
      if (history.entries.length === 0) return "No price history found for this part.";
      const lines = [`Price history for ${history.name}:`];
      for (const e of history.entries) {
        const range = `${e.effectiveFrom.slice(0, 10)} → ${e.effectiveTo ? e.effectiveTo.slice(0, 10) : "present"}`;
        const status = e.active ? "CURRENT" : "ended";
        lines.push(
          `  ${e.grade}: ${e.currency === "GHS" ? "GH₵" : e.currency + " "}${e.price} [${range}] (${status})${e.source ? ` src:${e.source}` : ""}${e.notes ? ` — ${e.notes}` : ""}`,
        );
      }
      return lines.join("\n");
    }
    case "record_feedback": {
      const feedbackType = String(args.feedbackType ?? "").trim();
      const allowed = new Set([
        "WRONG_PART",
        "PRICE_CORRECTED",
        "MISUNDERSTOOD_LOCAL_NAME",
        "COMPATIBILITY_CORRECTED",
        "RECOMMENDATION_REJECTED",
        "OTHER",
      ]);
      if (!allowed.has(feedbackType)) return `Error: invalid feedbackType '${feedbackType}'.`;
      const userInput = String(args.userInput ?? "").trim();
      if (!userInput) return "Error: missing 'userInput'.";
      const baseInput = {
        feedbackType,
        userInput: userInput.slice(0, 4000),
        aiResponse: args.aiResponse ? String(args.aiResponse).slice(0, 4000) : undefined,
        correctionText: args.correctionText ? String(args.correctionText).slice(0, 4000) : undefined,
        conversationId: sessionId,
      };
      let partId = args.partId ? String(args.partId) : undefined;
      if (partId) {
        const exists = await sql`SELECT 1 FROM parts WHERE id = ${partId}`;
        if (!exists.length) partId = undefined;
      }
      try {
        await recordFeedback({ ...baseInput, partId });
      } catch (e) {
        console.error("record_feedback failed, retrying without FKs:", e);
        await recordFeedback(baseInput);
      }
      return "Feedback recorded successfully. The team will review it.";
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

const SMALLTALK_RE =
  /^(hi+|hello+|hey+|yo|good\s*(morning|afternoon|evening)|thanks?|thank you|ok(ay)?|who are you|what can you do|what do you (do|sell)|how are you|bye+|goodbye)[\s!,.?]*$/i;

function isSmallTalk(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.length > 0 && t.length < 60 && SMALLTALK_RE.test(t);
}

const FEEDBACK_RE =
  /\b(price is wrong|wrong price|wrong part|incorrect|mistake|misheard|misunderstood|is wrong|should be|doesn'?t fit|does not fit|not compatible|wrong number|got it wrong|error in)\b/i;

function sse(controller: ReadableStreamDefaultController, event: unknown) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
}

const TOOL_NAMES = [
  "search_parts",
  "get_part_details",
  "check_compatibility",
  "find_related_parts",
  "get_engineering_knowledge",
  "search_manufacturer",
  "get_price_history",
  "record_feedback",
] as const;

const TOOL_SYNTAX_FULL_RE = new RegExp(
  `\\[(?:${TOOL_NAMES.join("|")})\\([^\\[\\]]*\\)\\]`,
  "gi",
);

const TOOL_SYNTAX_INCOMPLETE_RE = new RegExp(
  `\\[(?:${TOOL_NAMES.join("|")})\\([^\\[\\]]*$`,
  "i",
);

function parseToolSyntax(raw: string): CloudflareToolCall[] {
  const out: CloudflareToolCall[] = [];
  const re = new RegExp(TOOL_SYNTAX_FULL_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const inner = m[0].slice(1, -1);
    const nameMatch = inner.match(/^([a-z_]+)\(/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (!(TOOL_NAMES as readonly string[]).includes(name)) continue;
    const argsStart = inner.indexOf("(");
    const argsRaw = inner.slice(argsStart + 1, inner.lastIndexOf(")"));
    let args: Record<string, unknown> = {};
    try {
      const normalized = argsRaw
        .replace(/(\w+)\s*=\s*"([^"]*)"/g, '"$1": "$2"')
        .replace(/(\w+)\s*=\s*'([^']*)'/g, '"$1": "$2"')
        .replace(/(\w+)\s*=\s*([^,}\s]+)/g, '"$1": $2')
        .replace(/,\s*}/g, "}");
      args = JSON.parse(`{${normalized}}`);
    } catch {
      try {
        args = JSON.parse(argsRaw.startsWith("{") ? argsRaw : `{${argsRaw}}`);
      } catch {
        args = {};
      }
    }
    out.push({
      id: `call_${name}_${out.length}_${Date.now()}`,
      type: "function",
      function: { name, arguments: JSON.stringify(args) },
    });
  }
  return out;
}

const chatBodySchema = z.object({
  id: z.string().max(128).optional(),
  sessionId: z.string().max(128).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4_000).optional(),
        parts: z
          .array(z.object({ type: z.string().optional(), text: z.string().max(4_000).optional() }).passthrough())
          .max(20)
          .optional(),
      }).passthrough(),
    )
    .max(30)
    .optional(),
});

const MAX_MODEL_HISTORY = 20;

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!await rateLimitCheck({} as any, `chat:${ip}`, 20, 60_000)) {
    return new Response("Too many requests. Please wait a moment.", { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }
  const parsed = chatBodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response("Invalid request body.", { status: 400 });
  }
  const body = parsed.data;

  const rawMessages = (body.messages ?? []) as UiMessage[];
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

  const TOOL_SYNTAX_RE = TOOL_SYNTAX_FULL_RE;
  for (const m of rawMessages.slice(-MAX_MODEL_HISTORY)) {
    const text = messageToText(m).replace(TOOL_SYNTAX_RE, "").trim();
    if ((m.role === "user" || m.role === "assistant") && text) {
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
      let heldToolText = "";
      const textToolCalls: CloudflareToolCall[] = [];

      const emit = (text: string) => {
        if (!text) return;
        if (!started) {
          sse(controller, { type: "text-start", id: textId });
          started = true;
        }
        fullText += text;
        sse(controller, { type: "text-delta", id: textId, delta: text });
      };

      let roundBuffer = "";

      const flushBuffer = () => {
        if (roundBuffer) {
          emit(roundBuffer);
          roundBuffer = "";
        }
      };

      const findHoldIndex = (t: string): number | null => {
        const m = t.match(/\[([a-z_]*)$/i);
        if (m && typeof m.index === "number" && TOOL_NAMES.some((n) => n.startsWith(m[1].toLowerCase()))) {
          return m.index;
        }
        const m2 = t.match(TOOL_SYNTAX_INCOMPLETE_RE);
        if (m2 && typeof m2.index === "number") return m2.index;
        return null;
      };

      const sendDelta = (delta: string) => {
        heldToolText += delta;

        const completed = heldToolText.match(TOOL_SYNTAX_FULL_RE);
        if (completed) {
          const extracted = parseToolSyntax(heldToolText);
          for (const tc of extracted) textToolCalls.push(tc);
          heldToolText = heldToolText.replace(TOOL_SYNTAX_FULL_RE, "");
        }

        const holdIndex = findHoldIndex(heldToolText);
        if (holdIndex !== null) {
          roundBuffer += heldToolText.slice(0, holdIndex);
          heldToolText = heldToolText.slice(holdIndex);
        } else {
          roundBuffer += heldToolText;
          heldToolText = "";
        }
      };

      const flushHeld = () => {
        if (!heldToolText.trim()) {
          heldToolText = "";
          return;
        }
        let leftoverCalls = parseToolSyntax(heldToolText);
        if (leftoverCalls.length === 0 && /^\[(?:search_parts|get_part_details|check_compatibility|find_related_parts|get_engineering_knowledge|search_manufacturer|get_price_history|record_feedback)\(/i.test(heldToolText)) {
          leftoverCalls = parseToolSyntax(`${heldToolText}]`);
        }
        if (leftoverCalls.length > 0) {
          for (const tc of leftoverCalls) textToolCalls.push(tc);
          heldToolText = "";
          return;
        }
        roundBuffer += heldToolText;
        heldToolText = "";
      };

      try {
        const lastUserText = [...rawMessages].reverse().find((m) => m.role === "user");
        const lastUserContent = lastUserText ? messageToText(lastUserText) : "";
        const feedbackIntent = FEEDBACK_RE.test(lastUserContent);
        const forceSearch =
          !feedbackIntent && lastUserContent.trim().length > 0 && !isSmallTalk(lastUserContent);
        const searchEvents: { query: string; resultCount: number }[] = [];
        const calledTools: string[] = [];

        const conversation = await sql`
          INSERT INTO conversations (id, session_id, title, started_at, updated_at)
          VALUES (${sessionId}, ${sessionId}, ${lastUserContent.slice(0, 80) || null}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
          RETURNING *
        `;

        for (let round = 0; round < 4; round++) {
          const toolCalls: CloudflareToolCall[] = [];
          textToolCalls.length = 0;

          const roundOptions: Parameters<typeof cloudflareStreamChat>[1] = {
            model,
            tools: TOOLS,
            maxTokens: 3000,
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
              }
            }
          }

          flushHeld();
          for (const tc of textToolCalls) toolCalls.push(tc);

          if (toolCalls.length === 0) break;

          roundBuffer = "";

          history.push({
            role: "assistant",
            content: "",
            tool_calls: toolCalls,
          } as unknown as CloudflareMessage);

          for (const tc of toolCalls) {
            let result: string;
            calledTools.push(tc.function.name);
            try {
              result = await executeTool(tc, searchEvents, sessionId);
            } catch (e) {
              result = `Error executing ${tc.function.name}: ${e instanceof Error ? e.message : "unknown error"}`;
            }
            history.push({ role: "tool", tool_call_id: tc.id, content: result });
          }
        }

        if (feedbackIntent && !calledTools.includes("record_feedback")) {
          try {
            const fbType = /price/i.test(lastUserContent)
              ? "PRICE_CORRECTED"
              : /compatib|fit|vehicle/i.test(lastUserContent)
                ? "COMPATIBILITY_CORRECTED"
                : /part/i.test(lastUserContent)
                  ? "WRONG_PART"
                  : "OTHER";
            await recordFeedback({
              feedbackType: fbType,
              userInput: lastUserContent.slice(0, 4000),
              correctionText: lastUserContent.slice(0, 4000),
              conversationId: sessionId,
            });
            calledTools.push("record_feedback");
          } catch (e) {
            console.error("feedback fallback failed:", e);
          }
        }

        flushHeld();
        flushBuffer();

        if (!started) {
          try {
            for await (const chunk of cloudflareStreamChat(history, {
              model,
              maxTokens: 2000,
              temperature: 0.7,
            })) {
              if (chunk.type === "content") emit(String(chunk.data));
            }
          } catch (e) {
            console.error("final answer generation failed:", e);
          }
        }

        if (!started) {
          sse(controller, { type: "text-start", id: textId });
          const fallback = "I wasn't able to find that in our database. Could you rephrase the part name or share a part number?";
          fullText = fallback;
          sse(controller, { type: "text-delta", id: textId, delta: fallback });
        }
        sse(controller, { type: "text-end", id: textId });
        sse(controller, { type: "finish", finishReason: "stop" });

        try {
          const lastUser = [...rawMessages].reverse().find((m) => m.role === "user");
          const lastUserTextPersist = lastUser ? messageToText(lastUser) : "";
          if (lastUserTextPersist) {
            await sql`
              INSERT INTO conversation_messages (id, conversation_id, role, content)
              VALUES (${crypto.randomUUID()}, ${conversation[0].id}, 'USER', ${lastUserTextPersist.slice(0, 20_000)})
            `;
          }
          if (fullText) {
            await sql`
              INSERT INTO conversation_messages (id, conversation_id, role, content, model, tools_called)
              VALUES (
                ${crypto.randomUUID()},
                ${conversation[0].id},
                'ASSISTANT',
                ${fullText.slice(0, 50_000)},
                ${`cloudflare:${model}`},
                ${calledTools.length ? JSON.stringify(calledTools) : null}
              )
            `;
          }

          if (searchEvents.length > 0) {
            for (const e of searchEvents) {
              await sql`
                INSERT INTO search_query_logs (id, query, "resultCount", conversation_id)
                VALUES (${crypto.randomUUID()}, ${e.query}, ${e.resultCount}, ${conversation[0].id})
              `;
            }
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}