import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { chatApi, foodApi } from "../../api";
import type { Conversation } from "../../types";
import { Button } from "../../components/ui/Button";

type AgentType = "coach" | "nutritionist" | "general";

interface ChatMessage {
  role: string;
  content: string;
  id?: number;
  suggestedWorkout?:  Record<string, any>;
  suggestedPlan?:     Record<string, any>;
  suggestedMealPlan?: Record<string, any>;
}

const AGENTS: { id: AgentType; label: string; icon: string; desc: string }[] = [
  { id: "coach",        label: "AI Coach",     icon: "🏋️", desc: "Workout plans, recovery, technique tips" },
  { id: "nutritionist", label: "Nutritionist", icon: "🥗", desc: "Meal plans, macros, food advice" },
  { id: "general",      label: "General",      icon: "🤖", desc: "Any fitness or health question" },
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

// ── Chat bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ msg, agentIcon, onSaveWorkout, onSavePlan, onSaveMealPlan }: {
  msg:             ChatMessage;
  agentIcon:       string;
  onSaveWorkout:   (workout: Record<string, any>) => void;
  onSavePlan:      (plan: Record<string, any>) => void;
  onSaveMealPlan:  (plan: Record<string, any>) => void;
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
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={pi}>{p.slice(2, -2)}</strong>
          : <span key={pi}>{p}</span>
      );
      return (
        <p key={li} className={line.startsWith("- ") || line.startsWith("• ") ? "ml-3" : ""}>
          {rendered}
        </p>
      );
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
        isUser ? "bg-brand-600 text-white" : "bg-gray-100"
      }`}>
        {isUser ? "Me" : agentIcon}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-1 ${
          isUser
            ? "bg-brand-600 text-white rounded-tr-sm"
            : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
        }`}>
          {renderText(displayText)}
        </div>

        {/* Save buttons — only when structured data came back from the API */}
        {(msg.suggestedWorkout || msg.suggestedPlan || msg.suggestedMealPlan) && (
          <div className="flex gap-2 mt-1 flex-wrap">
            {msg.suggestedWorkout && (
              <button
                onClick={() => onSaveWorkout(msg.suggestedWorkout!)}
                className="text-xs text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1 rounded-full transition-colors font-medium"
              >
                💾 Save as Template
              </button>
            )}
            {msg.suggestedPlan && (
              <button
                onClick={() => onSavePlan(msg.suggestedPlan!)}
                className="text-xs text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-full transition-colors font-medium"
              >
                🎯 Save as Goal
              </button>
            )}
            {msg.suggestedMealPlan && (
              <button
                onClick={() => onSaveMealPlan(msg.suggestedMealPlan!)}
                className="text-xs text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-full transition-colors font-medium"
              >
                🥗 Log Meal Plan
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Chat page ────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const defaultAgent   = (searchParams.get("agent") as AgentType) || "general";

  const [agent,    setAgent]    = useState<AgentType>(defaultAgent);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState("");
  const [typing,   setTyping]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [saveMsg,  setSaveMsg]  = useState<{ text: string; ok: boolean } | null>(null);
  const bottomRef              = useRef<HTMLDivElement>(null);
  const inputRef               = useRef<HTMLTextAreaElement>(null);

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
            role:    "assistant",
            content: c.response,
            id:      c.id,
            ...(meta.suggestedWorkout  && { suggestedWorkout:  meta.suggestedWorkout }),
            ...(meta.suggestedPlan     && { suggestedPlan:     meta.suggestedPlan }),
            ...(meta.suggestedMealPlan && { suggestedMealPlan: meta.suggestedMealPlan }),
          });
        }
      }
      setMessages(convs);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadHistory(agent); }, [agent, loadHistory]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const agentInfo = AGENTS.find((a) => a.id === agent)!;

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
      const { message: aiText, suggestedWorkout, suggestedPlan, suggestedMealPlan } = res.data;
      setMessages((prev) => [
        ...prev,
        {
          role:    "assistant",
          content: aiText,
          ...(suggestedWorkout  && { suggestedWorkout }),
          ...(suggestedPlan     && { suggestedPlan }),
          ...(suggestedMealPlan && { suggestedMealPlan }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't respond right now. Please try again." },
      ]);
    } finally { setTyping(false); }
  };

  const clearHistory = async () => {
    if (!confirm(`Clear ${agentInfo.label} conversation history?`)) return;
    await chatApi.clearHistory(agent);
    setMessages([]);
  };

  // Save workout template using the structured JSON the AI embedded
  const handleSaveWorkout = async (workout: Record<string, any>) => {
    try {
      await chatApi.saveWorkout({
        name:         workout.name        || `${agentInfo.label} Workout`,
        description:  workout.description || "Suggested by AI Coach",
        splitType:    workout.splitType   || "Custom",
        objective:    workout.objective   || "general",
        frequency:    workout.frequency   ?? 3,
        dayLabel:     workout.dayLabel    || workout.name || "AI Workout",
        muscleGroups: workout.muscleGroups ?? [],
        exercises:    workout.exercises   ?? [],
      });
      showToast("✅ Template saved! Check your Templates page.");
    } catch (err: any) {
      const detail = err?.response?.data?.error || "Unknown error";
      showToast(`❌ Couldn't save template: ${detail}`, false);
    }
  };

  // Bulk-log a meal plan suggested by the nutritionist agent
  const handleSaveMealPlan = async (mealPlan: Record<string, any>) => {
    try {
      const meals: Array<any> = mealPlan.meals ?? [];
      const foods = meals.flatMap((meal: any) =>
        (meal.items ?? []).map((item: any) => ({
          foodName: item.foodName,
          calories: item.calories ?? 0,
          protein:  item.protein  ?? 0,
          carbs:    item.carbs    ?? 0,
          fats:     item.fats     ?? 0,
          quantity: item.quantity ?? 1,
          unit:     item.unit     ?? "serving",
          meal:     meal.mealType as "breakfast" | "lunch" | "dinner" | "snack" | null,
        }))
      );
      if (foods.length === 0) {
        showToast("❌ No food items found in the meal plan", false);
        return;
      }
      await foodApi.bulk(foods);
      showToast(`✅ ${foods.length} items logged to today's nutrition!`);
    } catch (err: any) {
      const detail = err?.response?.data?.error || "Unknown error";
      showToast(`❌ Couldn't log meal plan: ${detail}`, false);
    }
  };

  // Save calorie / macro plan using the structured JSON the AI embedded
  const handleSavePlan = async (plan: Record<string, any>) => {
    try {
      await chatApi.saveCaloriePlan({
        name:          plan.name,
        currentWeight: plan.currentWeight,
        targetWeight:  plan.targetWeight,
        targetDate:    plan.targetDate,
        dailyCalories: plan.dailyCalories,
        proteinGrams:  plan.proteinGrams,
        carbsGrams:    plan.carbsGrams,
        fatsGrams:     plan.fatsGrams,
        notes:         plan.notes,
      });
      showToast("✅ Calorie goal saved! Check your Goals page.");
    } catch (err: any) {
      const detail = err?.response?.data?.error || "Unknown error";
      showToast(`❌ Couldn't save plan: ${detail}`, false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-50">
      {/* Agent switcher + header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-gray-900">AI Coach</h1>
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear history
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {AGENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAgent(a.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  agent === a.id
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                {agentInfo.icon}
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">{agentInfo.label}</h2>
              <p className="text-sm text-gray-500 mb-8">{agentInfo.desc}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                {STARTERS[agent].map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left text-sm bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-brand-300 hover:bg-brand-50 transition-colors text-gray-700"
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
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0">
                {agentInfo.icon}
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Toast notification */}
      {saveMsg && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50 transition-all ${
          saveMsg.ok ? "bg-gray-900" : "bg-red-600"
        }`}>
          {saveMsg.text}
        </div>
      )}

      {/* Input bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-4 shrink-0">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={`Ask ${agentInfo.label}…  (Shift+Enter for new line)`}
            rows={1}
            className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-40 overflow-y-auto"
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
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
