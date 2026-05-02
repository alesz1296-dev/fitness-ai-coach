import { env } from "../../config/env.js";
import { OpenAIAdapter } from "./openai.js";
import { DeepSeekAdapter } from "./deepseek.js";
import type { ProviderAdapter } from "./ProviderAdapter.js";

// ─────────────────────────────────────────────────────────────────────────────
// Provider factory
//
// Reads AI_PROVIDER env var (defaults to "openai").
// Supported values: "openai" | "deepseek"
//
// Usage in agent.ts:
//   import { getProvider } from "./providers/index.js";
//   const provider = getProvider();
//   const result = await provider.complete({ model: provider.defaultModel, ... });
// ─────────────────────────────────────────────────────────────────────────────

let _cached: ProviderAdapter | null = null;

export function getProvider(): ProviderAdapter {
  if (_cached) return _cached;

  const name = env.AI_PROVIDER ?? "openai";

  switch (name) {
    case "deepseek":
      _cached = new DeepSeekAdapter();
      break;
    case "openai":
    default:
      _cached = new OpenAIAdapter();
      break;
  }

  return _cached;
}

export type { ProviderAdapter } from "./ProviderAdapter.js";
