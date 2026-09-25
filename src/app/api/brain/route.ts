/**
 * DEGOONY Brain — Test endpoint for Cloudflare Workers AI.
 *
 * GET  /api/brain  → status check (is Cloudflare configured?)
 * POST /api/brain  → send a test message and get a response
 */

import {
  cloudflareChat,
  isCloudflareConfigured,
  getFastModel,
  getThinkingModel,
  type CloudflareMessage,
  type CloudflareTool,
} from "@/lib/cloudflare";

export const maxDuration = 30;

export async function GET() {
  const configured = isCloudflareConfigured();
  return Response.json({
    status: configured ? "ready" : "not_configured",
    message: configured
      ? "Cloudflare Workers AI is configured and ready."
      : "CLOUDFLARE_API_TOKEN not set. Add it to .env.",
    fastModel: getFastModel(),
    thinkingModel: getThinkingModel(),
  });
}

export async function POST(req: Request) {
  if (!isCloudflareConfigured()) {
    return Response.json(
      { error: "Cloudflare not configured. Set CLOUDFLARE_API_TOKEN in .env" },
      { status: 503 },
    );
  }

  let body: { message?: string; brain?: "fast" | "thinking"; tools?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userMessage = body.message || "Hello, who are you?";
  const useThinking = body.brain === "thinking";

  const systemPrompt = `You are DEGOONY Intelligence Bot — an intelligent Ghanaian spare-parts sales and logistics business assistant for Bajaj (tuk-tuk) and TVS three-wheelers.

You can help with:
- Spare parts search, pricing, and compatibility
- Vehicle information and service records
- Order management and delivery tracking
- Sales analytics and business intelligence
- Customer support

Be concise, helpful, and professional. Currency is GH₵ (Ghana Cedi).`;

  const messages: CloudflareMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const exampleTools: CloudflareTool[] | undefined = body.tools
    ? [
        {
          type: "function",
          function: {
            name: "search_parts",
            description: "Search spare parts by name or part number",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "Part name or number to search" },
              },
              required: ["query"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "get_vehicles",
            description: "Get list of supported vehicles",
            parameters: {
              type: "object",
              properties: {},
              required: [],
            },
          },
        },
      ]
    : undefined;

  try {
    const model = useThinking ? getThinkingModel() : getFastModel();

    const result = await cloudflareChat(messages, {
      model,
      tools: exampleTools,
      temperature: 0.7,
    });

    const choice = result.choices?.[0];
    if (!choice) {
      return Response.json({ error: "No response from Cloudflare" }, { status: 500 });
    }

    return Response.json({
      brain: useThinking ? "thinking" : "fast",
      model: result.model,
      response: choice.message?.content || "",
      toolCalls: choice.message?.tool_calls || null,
      usage: result.usage,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Cloudflare brain error:", message);
    return Response.json({ error: message }, { status: 502 });
  }
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