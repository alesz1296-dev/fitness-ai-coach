import OpenAI from "openai";
import { env } from "../../config/env.js";
import type { CompletionOptions, CompletionResult, ProviderAdapter } from "./ProviderAdapter.js";

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI provider adapter
// ─────────────────────────────────────────────────────────────────────────────

export class OpenAIAdapter implements ProviderAdapter {
  readonly defaultModel = "gpt-4o-mini";

  private readonly client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
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
      throw new Error("OpenAI returned no choices.");
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
      const { status, code, type } = error;
      if (status === 429) return "The AI service is temporarily rate-limited. Please wait a moment and try again.";
      if (status === 503 || status === 529) return "OpenAI is temporarily overloaded. Please try again in a few seconds.";
      if (status === 400 && (code === "context_length_exceeded" || type === "invalid_request_error")) {
        return "This conversation is too long for the AI to process. Please start a new chat to continue.";
      }
      if (status === 400 && code === "model_not_found") return "The AI model is not available right now. Please contact support.";
      if (status === 401) return "AI service authentication failed. Please contact support.";
      if (status === 402) return "AI service quota exceeded. Please contact support.";
      return `The AI service returned an error (${status}). Please try again.`;
    }
    return "An unexpected error occurred. Please try again.";
  }

  isRateLimitError(error: unknown): boolean {
    return error instanceof OpenAI.APIError && error.status === 429;
  }
}
