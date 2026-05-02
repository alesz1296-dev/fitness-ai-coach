import OpenAI from "openai";
import { env } from "../../config/env.js";
import type { CompletionOptions, CompletionResult, ProviderAdapter } from "./ProviderAdapter.js";

// ─────────────────────────────────────────────────────────────────────────────
// DeepSeek provider adapter
//
// DeepSeek exposes an OpenAI-compatible REST API, so we reuse the OpenAI SDK
// with a custom baseURL. The only differences are:
//   - baseURL → https://api.deepseek.com
//   - apiKey  → env.DEEPSEEK_API_KEY
//   - model   → "deepseek-chat" (maps to DeepSeek-V3 in production)
//
// Tool calling format is identical to OpenAI's, so TOOL_DEFINITIONS in
// agent.ts need no changes when switching providers.
// ─────────────────────────────────────────────────────────────────────────────

export class DeepSeekAdapter implements ProviderAdapter {
  readonly defaultModel = "deepseek-chat";

  private readonly client: OpenAI;

  constructor() {
    if (!env.DEEPSEEK_API_KEY) {
      throw new Error(
        "DEEPSEEK_API_KEY is not set. Add it to your .env to use the DeepSeek provider.",
      );
    }
    this.client = new OpenAI({
      apiKey: env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const completion = await this.client.chat.completions.create({
      model: options.model,
      messages: options.messages,
      tools: options.tools,
      tool_choice: options.tool_choice ?? "auto",
      max_tokens: options.max_tokens ?? 1000,
      temperature: options.temperature ?? 0.7,
    });

    const message = completion.choices[0]?.message;
    if (!message) {
      throw new Error("DeepSeek returned no choices.");
    }

    return {
      message,
      tokensUsed: completion.usage?.total_tokens ?? 0,
    };
  }

  classifyError(error: unknown): string {
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return "The request to the AI timed out. Please try again in a moment.";
    }
    if (error instanceof OpenAI.APIConnectionError) {
      return "Unable to reach the AI service. Check your internet connection and try again.";
    }
    if (error instanceof OpenAI.APIError) {
      const { status } = error;
      if (status === 429) return "The AI service is temporarily rate-limited. Please wait a moment and try again.";
      if (status === 503) return "DeepSeek is temporarily unavailable. Please try again in a few seconds.";
      if (status === 401) return "DeepSeek authentication failed. Check your DEEPSEEK_API_KEY.";
      if (status === 402) return "DeepSeek quota exceeded. Please top up your balance.";
      return `The AI service returned an error (${status}). Please try again.`;
    }
    return "An unexpected error occurred. Please try again.";
  }

  isRateLimitError(error: unknown): boolean {
    return error instanceof OpenAI.APIError && error.status === 429;
  }
}
