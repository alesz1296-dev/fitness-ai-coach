import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { chatApi } from "../../api";
import type { Conversation } from "../../types";
import { Button } from "../../components/ui/Button";

type AgentType = "coach" | "nutritionist" | "general";

interface ChatMessage {
  role: string;
  content: string;
  id?: number;
  suggestedWorkout?: Record<string, any>;
  suggestedPlan?: Record<string, any>;
  suggestedMealPlan?: Record<string, any>;
}

const AGENTS: { id: AgentType; label: string; icon: string; desc: string }[] = [
  {
    id: "coach",
    label: "AI Coach",
    icon: "🏋️",
    desc: "Workout plans, recovery, technique tips",
  },
  {
    id: "nutritionist",
    label: "Nutritionist",
    icon: "🥗",
    desc: "Meal plans, macros, food advice",
  },
  {
    id: "general",
    label: "General",
    icon: "🤖",
    desc: "Any fitness or health question",
  },
];

const STARTERS: Record<AgentType, string[]> = {
  coach: [
    "Create a 4-day Upper/Lower split for me",
    "What's the best routine for building a bigger back?",
    "How should I structure progressive overload?",
    "Give me a Push Day workout I can save",
  ],
  nutritionist: [
    "What should I eat to build muscle while staying lean?",
    "Create a high-protein meal plan for 2500 calories",
    "How much protein do I really need per day?",
    "Give me a calorie plan to lose 1kg per week",
  ],
  general: [
    "How many rest days should I take per week?",
    "What's the best way to track my progress?",
    "How do I avoid a training plateau?",
    "Explain the difference between cutting and bulking",
  ],
};

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

// ── Suggestion action card ────────────────────────────────────────────────────
type CardState = "idle" | "saving" | "saved" | "dismissed";

function SuggestionCard({
  icon,
  title,
  question,
  confirmLabel,
  confirmStyle,
  onConfirm,
}: {
  icon: string;
  title: string;
  question: string;
  confirmLabel: string;
  confirmStyle: string;
  onConfirm: () => Promise<void>;
}) {
  const [state, setState] = useState<CardState>("idle");

  if (state === "dismissed") return null;

  const handleConfirm = async () => {
    setState("saving");
    try {
      await onConfirm();
      setState("saved");
    } catch {
      setState("idle");
    }
  };

  return (
    <div
      className={`mt-2 rounded-2xl border px-4 py-3 text-sm w-full max-w-sm transition-all ${
        state === "saved"
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
      }`}
    >
      {state === "saved" ? (
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
          <span>✅</span>
          <span>Saved! Check {title}.</span>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2 mb-3">
            <span className="text-xl shrink-0">{icon}</span>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-tight">
                {title}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                {question}
              </p>
            </div>
            <button
              onClick={() => setState("dismissed")}
              className="ml-auto text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 text-lg leading-none shrink-0"
              title="Dismiss"
            >
              ×
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={state === "saving"}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${confirmStyle} disabled:opacity-60`}
            >
              {state === "saving" ? "Saving…" : confirmLabel}
            </button>
            <button
              onClick={() => setState("dismissed")}
              className="px-3 py-2 rounded-xl text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Not now
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function ChatBubble({
  msg,
  agentIcon,
  onSaveWorkout,
  onSavePlan,
  onSaveMealPlan,
}: {
  msg: ChatMessage;
  agentIcon: string;
  onSaveWorkout: (workout: Record<string, any>) => Promise<void>;
  onSavePlan: (plan: Record<string, any>) => Promise<void>;
  onSaveMealPlan: (plan: Record<string, any>) => Promise<void>;
}) {
  const isUser = msg.role === "user";

  // Strip all fenced JSON blocks from displayed text so users don't see raw JSON
  const displayText = msg.content
    .replace(/```workout-json[\s\S]*?```/g, "")
    .replace(/```nutrition-json[\s\S]*?```/g, "")
    .replace(/```meal-plan-json[\s\S]*?```/g, "")
    .trim();

  // Simple markdown-ish rendering: bold (**text**), line breaks
  const renderText = (raw: string) => {
    const lines = raw.split("\n");
    return lines.map((line, li) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((p, pi) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={pi}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={pi}>{p}</span>
        ),
      );
      return (
        <p
          key={li}
          className={
            line.startsWith("- ") || line.startsWith("• ") ? "ml-3" : ""
          }
        >
          {rendered}
        </p>
      );
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
          isUser ? "bg-brand-600 text-white" : "bg-gray-100 dark:bg-gray-700"
        }`}
      >
        {isUser ? "Me" : agentIcon}
      </div>

      {/* Bubble + action cards */}
      <div
        className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}
      >
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-1 ${
            isUser
              ? "bg-brand-600 text-white rounded-tr-sm"
              : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm shadow-sm"
          }`}
        >
          {renderText(displayText)}
        </div>

        {/* Prominent action cards — one per suggestion type */}
        {msg.suggestedWorkout && (
          <SuggestionCard
            icon="💪"
            title="Your Workouts"
            question={
              msg.suggestedWorkout.mode === "replace"
                ? "Want to replace this saved workout template?"
                : "Want to save this workout plan to your templates?"
            }
            confirmLabel={
              msg.suggestedWorkout.mode === "replace"
                ? "Yes, update Workout"
                : "Yes, add to Workouts"
            }
            confirmStyle="bg-brand-600 hover:bg-brand-700 text-white"
            onConfirm={() => onSaveWorkout(msg.suggestedWorkout!)}
          />
        )}
        {msg.suggestedMealPlan && (
          <SuggestionCard
            icon="🥗"
            title="Meal Planner"
            question={
              msg.suggestedMealPlan.mode === "replace"
                ? "Want to replace this Meal Planner plan?"
                : msg.suggestedMealPlan.mode === "append"
                  ? "Want to add these meals to your Meal Planner?"
                  : "Want to save this plan to Meal Planner?"
            }
            confirmLabel={
              msg.suggestedMealPlan.mode === "replace"
                ? "Yes, update Meal Plan"
                : "Yes, save Meal Plan"
            }
            confirmStyle="bg-orange-500 hover:bg-orange-600 text-white"
            onConfirm={() => onSaveMealPlan(msg.suggestedMealPlan!)}
          />
        )}
        {msg.suggestedPlan && (
          <SuggestionCard
            icon="🎯"
            title="Goals"
            question="Want to save this calorie & macro plan to your goals?"
            confirmLabel="Yes, save as Goal"
            confirmStyle="bg-green-600 hover:bg-green-700 text-white"
            onConfirm={() => onSavePlan(msg.suggestedPlan!)}
          />
        )}
      </div>
    </div>
  );
}

// ── Main Chat page ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const defaultAgent = (searchParams.get("agent") as AgentType) || "general";

  const [agent, setAgent] = useState<AgentType>(defaultAgent);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [pendingAgent, setPendingAgent] = useState<AgentType | null>(null);
  const [sidebarHistory, setSidebarHistory] = useState<Conversation[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversation history — metadata is parsed server-side and returned
  // alongside each entry so save buttons can be re-hydrated on old messages.
  const loadHistory = useCallback(async (a: AgentType) => {
    setLoading(true);
    try {
      const res = await chatApi.getHistory(a, 1, 30);
      const convs: ChatMessage[] = [];
      for (const c of res.data.conversations) {
        convs.push({ role: "user", content: c.message, id: c.id });
        if (c.response) {
          const meta = c.metadata ?? {};
          convs.push({
            role: "assistant",
            content: c.response,
            id: c.id,
            ...(meta.suggestedWorkout && {
              suggestedWorkout: meta.suggestedWorkout,
            }),
            ...(meta.suggestedPlan && { suggestedPlan: meta.suggestedPlan }),
            ...(meta.suggestedMealPlan && {
              suggestedMealPlan: meta.suggestedMealPlan,
            }),
          });
        }
      }
      setMessages(convs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(agent);
  }, [agent, loadHistory]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Sidebar: fetch recent messages across all agents
  const loadSidebarHistory = useCallback(async () => {
    try {
      const res = await chatApi.getHistory(undefined, 1, 30);
      setSidebarHistory(res.data.conversations);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadSidebarHistory();
  }, [loadSidebarHistory, messages.length]);

  const agentInfo = AGENTS.find((a) => a.id === agent)!;

  // Switch with confirmation if there's an active conversation
  const requestSwitchAgent = (next: AgentType) => {
    if (next === agent) return;
    if (messages.length > 0) {
      setPendingAgent(next);
    } else {
      setAgent(next);
    }
  };

  const confirmSwitch = () => {
    if (!pendingAgent) return;
    setAgent(pendingAgent);
    setPendingAgent(null);
  };

  // Sidebar helpers
  const relativeDay = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const showToast = (text: string, ok = true) => {
    setSaveMsg({ text, ok });
    setTimeout(() => setSaveMsg(null), 3500);
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setTyping(true);

    try {
      const res = await chatApi.send({ message: msg, agentType: agent });
      const {
        message: aiText,
        suggestedWorkout,
        suggestedPlan,
        suggestedMealPlan,
      } = res.data;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiText,
          ...(suggestedWorkout && { suggestedWorkout }),
          ...(suggestedPlan && { suggestedPlan }),
          ...(suggestedMealPlan && { suggestedMealPlan }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't respond right now. Please try again.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm(`Clear ${agentInfo.label} conversation history?`)) return;
    await chatApi.clearHistory(agent);
    setMessages([]);
  };

  // Save workout template using the structured JSON the AI embedded
  // Returns a resolved promise on success, throws on failure (so SuggestionCard can track state)
  const handleSaveWorkout = async (
    workout: Record<string, any>,
  ): Promise<void> => {
    await chatApi.saveWorkout({
      mode: workout.mode === "replace" ? "replace" : "create",
      targetTemplateId: workout.targetTemplateId ?? null,
      name: workout.name || `${agentInfo.label} Workout`,
      description: workout.description || "Suggested by AI Coach",
      splitType: workout.splitType || "Custom",
      objective: workout.objective || "general",
      frequency: workout.frequency ?? 3,
      dayLabel: workout.dayLabel || workout.name || "AI Workout",
      muscleGroups: workout.muscleGroups ?? [],
      exercises: workout.exercises ?? [],
    });
    showToast(
      workout.mode === "replace"
        ? "✅ Template updated! Check Workouts."
        : "✅ Template saved! Check Workouts.",
    );
  };

  // Save/update a Meal Planner plan using the structured JSON the AI embedded.
  const handleSaveMealPlan = async (
    mealPlan: Record<string, any>,
  ): Promise<void> => {
    await chatApi.saveMealPlan({
      mode:
        mealPlan.mode === "replace" || mealPlan.mode === "append"
          ? mealPlan.mode
          : "create",
      targetPlanId: mealPlan.targetPlanId ?? null,
      name: mealPlan.name,
      weekStart: mealPlan.weekStart,
      days: mealPlan.days,
      meals: mealPlan.meals,
    });
    showToast(
      mealPlan.mode === "replace"
        ? "✅ Meal plan updated! Check Meal Planner."
        : "✅ Meal plan saved! Check Meal Planner.",
    );
  };

  // Save calorie / macro plan using the structured JSON the AI embedded
  const handleSavePlan = async (plan: Record<string, any>): Promise<void> => {
    await chatApi.saveCaloriePlan({
      name: plan.name,
      currentWeight: plan.currentWeight,
      targetWeight: plan.targetWeight,
      targetDate: plan.targetDate,
      dailyCalories: plan.dailyCalories,
      proteinGrams: plan.proteinGrams,
      carbsGrams: plan.carbsGrams,
      fatsGrams: plan.fatsGrams,
      notes: plan.notes,
    });
    showToast("✅ Calorie goal saved! Check your Goals page.");
  };

  return (
    <>
      {/* pb-14 on mobile reserves space above the fixed bottom nav bar (h-14 = 56px) */}
      <div className="flex h-screen max-h-screen bg-gray-50 dark:bg-gray-900 pb-14 md:pb-0">
        {/* ── History Sidebar ────────────────────────────────────────────────── */}
        <aside className="w-56 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex-col hidden lg:flex">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Recent chats
            </p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {sidebarHistory.length === 0 ? (
              <p className="text-xs text-gray-300 dark:text-gray-600 px-4 py-3">
                No history yet
              </p>
            ) : (
              sidebarHistory.map((c) => {
                const agentDef = AGENTS.find((a) => a.id === c.agentType);
                return (
                  <button
                    key={c.id}
                    onClick={() => requestSwitchAgent(c.agentType as AgentType)}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group ${
                      c.agentType === agent
                        ? "bg-brand-50 dark:bg-brand-900/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base">
                        {agentDef?.icon ?? "🤖"}
                      </span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {agentDef?.label}
                      </span>
                      <span className="ml-auto text-[10px] text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500">
                        {relativeDay(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate pl-6">
                      {c.message}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main chat column ───────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Agent switcher + header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  AI Coach
                </h1>
                {messages.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                  >
                    Clear history
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {AGENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => requestSwitchAgent(a.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      agent === a.id
                        ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-sm"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span>{a.icon}</span>
                    <span className="hidden sm:inline">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-5">
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
                </div>
              ) : messages.length === 0 ? (
                /* Welcome / starter prompts */
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                    {agentInfo.icon}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {agentInfo.label}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                    {agentInfo.desc}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                    {STARTERS[agent].map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 hover:border-brand-300 dark:hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-gray-700 dark:text-gray-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <ChatBubble
                    key={i}
                    msg={m}
                    agentIcon={agentInfo.icon}
                    onSaveWorkout={handleSaveWorkout}
                    onSavePlan={handleSavePlan}
                    onSaveMealPlan={handleSaveMealPlan}
                  />
                ))
              )}

              {typing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm shrink-0">
                    {agentInfo.icon}
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm shadow-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Toast notification */}
          {saveMsg && (
            <div
              className={`fixed bottom-24 left-1/2 -translate-x-1/2 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50 transition-all ${
                saveMsg.ok ? "bg-gray-900" : "bg-red-600"
              }`}
            >
              {saveMsg.text}
            </div>
          )}

          {/* Input bar */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 px-4 py-4 shrink-0">
            <div className="max-w-3xl mx-auto flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`Ask ${agentInfo.label}…  (Shift+Enter for new line)`}
                rows={1}
                className="flex-1 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-40 overflow-y-auto"
                style={{ minHeight: "44px" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 160) + "px";
                }}
              />
              <Button
                onClick={() => send()}
                disabled={!input.trim() || typing}
                className="shrink-0 h-11 w-11 rounded-2xl p-0 flex items-center justify-center"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </div>
        {/* end main chat column */}
      </div>
      {/* end flex outer */}

      {/* ── Agent-switch confirmation modal (#15) ──────────────────────────── */}
      {pendingAgent &&
        (() => {
          const next = AGENTS.find((a) => a.id === pendingAgent)!;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
                <div className="text-center mb-4">
                  <span className="text-4xl">{next.icon}</span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1 text-center">
                  Switch to {next.label}?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 text-center">
                  Your current conversation is saved. You can switch back
                  anytime.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setPendingAgent(null)}
                  >
                    Stay here
                  </Button>
                  <Button className="flex-1" onClick={confirmSwitch}>
                    Switch
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
