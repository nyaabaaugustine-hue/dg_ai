import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { isCloudflareConfigured, getFastModel, getThinkingModel } from "./cloudflare";

export type LlmProviderConfig = {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
};

/**
 * Get the Cloudflare Workers AI provider config.
 * Returns null if not configured.
 */
export function getCloudflareProvider(): LlmProviderConfig | null {
  if (!isCloudflareConfigured()) return null;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!.trim();
  return {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`,
    apiKey: process.env.CLOUDFLARE_API_TOKEN!.trim(),
    model: getThinkingModel(),
  };
}

/**
 * Returns the list of available providers (Cloudflare only).
 */
export function getProviderList(): LlmProviderConfig[] {
  const cf = getCloudflareProvider();
  return cf ? [cf] : [];
}

export function getPrimaryProvider(): LlmProviderConfig | null {
  return getCloudflareProvider();
}

export function getLanguageModel(cfg: LlmProviderConfig): LanguageModel {
  const client = createOpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
  });
  return client(cfg.model);
}

// ---------------------------------------------------------------------------
// Health tracking
// ---------------------------------------------------------------------------

const failedAt = new Map<string, number>();
const COOLDOWN_MS = 60_000;

export function markProviderFailed(id: string) {
  failedAt.set(id, Date.now());
}

export function markProviderOk(id: string) {
  failedAt.delete(id);
}

export function isProviderHealthy(id: string): boolean {
  const at = failedAt.get(id);
  if (!at) return true;
  return Date.now() - at > COOLDOWN_MS;
}

export function getHealthyProviderList(): LlmProviderConfig[] {
  return getProviderList().filter((p) => isProviderHealthy(p.id));
}
