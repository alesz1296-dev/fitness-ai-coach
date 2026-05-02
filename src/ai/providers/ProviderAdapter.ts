import type OpenAI from "openai";

// ─────────────────────────────────────────────────────────────────────────────
// ProviderAdapter — shared interface for all LLM provider implementations
//
// Both OpenAI and DeepSeek (OpenAI-compatible REST) implement this.
// agent.ts calls provider.complete() and never imports OpenAI directly.
// ─────────────────────────────────────────────────────────────────────────────

export interface CompletionOptions {
  model: string;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  tools?: OpenAI.Chat.ChatCompletionTool[];
  tool_choice?: "auto" | "none" | "required";
  max_tokens?: number;
  temperature?: number;
}

export interface CompletionResult {
  /** The assistant's response message (may contain tool_calls). */
  message: OpenAI.Chat.ChatCompletionMessage;
  /** Total tokens consumed in this single API call. */
  tokensUsed: number;
}

export interface ProviderAdapter {
  /** The default model string for this provider (e.g. "gpt-4o-mini"). */
  defaultModel: string;

  /** Call the provider and return a normalised result. Throws on API errors. */
  complete(options: CompletionOptions): Promise<CompletionResult>;

  /**
   * Convert a raw API error into a user-facing message string.
   * Agent loop calls this inside its catch block.
   */
  classifyError(error: unknown): string;

  /**
   * Returns true if the error is a rate-limit (429).
   * Used by agent.ts to decide which HTTP status to propagate.
   */
  isRateLimitError(error: unknown): boolean;
}
