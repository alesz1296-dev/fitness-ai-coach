import OpenAI from "openai";
import { AgentType, buildSystemPrompt, UserContext } from "./prompts.js";
import logger from "../lib/logger.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentResponse {
  message: string;
  tokensUsed?: number;
}

/**
 * Send a message to the AI agent with conversation history for context.
 */
export const chat = async (
  userMessage: string,
  agentType: AgentType,
  user: UserContext,
  history: ChatMessage[] = []
): Promise<AgentResponse> => {
  const systemPrompt = buildSystemPrompt(agentType, user);

  // Build message array — system + recent history (last 10 turns) + new message
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  logger.debug(`AI agent (${agentType}) — sending ${messages.length} messages`);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    max_tokens: 800,
    temperature: 0.7,
  });

  const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";
  const tokensUsed = completion.usage?.total_tokens;

  logger.debug(`AI agent response — ${tokensUsed} tokens used`);

  return { message: reply, tokensUsed };
};
