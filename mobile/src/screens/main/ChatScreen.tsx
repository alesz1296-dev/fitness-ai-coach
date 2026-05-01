import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, FlatList,
} from "react-native";
import { chatApi } from "../../api";
import type { Conversation } from "@shared/types";

type AgentType = "coach" | "nutritionist" | "general";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id?: number;
  suggestedWorkout?:  Record<string, any>;
  suggestedPlan?:     Record<string, any>;
  suggestedMealPlan?: Record<string, any>;
}

const AGENTS: { id: AgentType; label: string; icon: string; desc: string }[] = [
  { id: "coach",        label: "AI Coach",     icon: "🏋️", desc: "Workout plans, technique, recovery" },
  { id: "nutritionist", label: "Nutritionist", icon: "🥗", desc: "Meal plans, macros, food advice" },
  { id: "general",      label: "General",      icon: "🤖", desc: "Any fitness or health question" },
];

const STARTERS: Record<AgentType, string[]> = {
  coach: [
    "Create a 4-day Upper/Lower split",
    "Best routine for a bigger back?",
    "How should I structure progressive overload?",
    "Give me a Push Day workout",
  ],
  nutritionist: [
    "Build muscle while staying lean",
    "High-protein meal plan for 2500 kcal",
    "How much protein do I need daily?",
    "Lose 1kg per week calorie plan",
  ],
  general: [
    "How many rest days per week?",
    "Best way to track progress?",
    "How do I avoid a training plateau?",
    "Cutting vs bulking — what's the difference?",
  ],
};

function fromHistory(c: Conversation): ChatMessage[] {
  const msgs: ChatMessage[] = [{ role: "user", content: c.message }];
  if (c.response) {
    msgs.push({
      role: "assistant",
      content: c.response,
      id: c.id,
      suggestedWorkout:  c.metadata?.suggestedWorkout,
      suggestedPlan:     c.metadata?.suggestedPlan,
      suggestedMealPlan: c.metadata?.suggestedMealPlan,
    });
  }
  return msgs;
}

export function ChatScreen() {
  const [agent,     setAgent]     = useState<AgentType>("coach");
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [input,     setInput]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [loadingHx, setLoadingHx] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadHistory = useCallback(async (a: AgentType) => {
    setLoadingHx(true);
    try {
      const res = await chatApi.getHistory(a, 1, 20);
      const flat: ChatMessage[] = res.data.conversations
        .slice()
        .reverse()
        .flatMap((c: Conversation) => fromHistory(c));
      setMessages(flat);
    } catch { setMessages([]); }
    finally { setLoadingHx(false); }
  }, []);

  useEffect(() => { loadHistory(agent); }, [agent, loadHistory]);

  const scrollToBottom = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    scrollToBottom();
    try {
      const res = await chatApi.send({ message: msg, agentType: agent });
      const d = res.data;
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: d.message,
        id: d.conversationId,
        suggestedWorkout:  d.suggestedWorkout,
        suggestedPlan:     d.suggestedPlan,
        suggestedMealPlan: d.suggestedMealPlan,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      scrollToBottom();
    } catch (e: any) {
      const errMsg = e?.response?.data?.error ?? "Failed to send message. Try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${errMsg}` }]);
    } finally {
      setSending(false);
    }
  };

  const switchAgent = (a: AgentType) => {
    if (a === agent) return;
    setAgent(a);
    setMessages([]);
  };

  const isEmpty  = messages.length === 0 && !loadingHx;
  const starters = STARTERS[agent];

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {/* ── Agent selector ─────────────────────────────────────────────── */}
      <View style={s.agentBar}>
        {AGENTS.map((a) => (
          <Pressable
            key={a.id}
            style={[s.agentTab, agent === a.id && s.agentTabActive]}
            onPress={() => switchAgent(a.id)}
          >
            <Text style={s.agentTabIcon}>{a.icon}</Text>
            <Text style={[s.agentTabLabel, agent === a.id && s.agentTabLabelActive]}>
              {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── Agent description strip ─────────────────────────────────────── */}
      <View style={s.agentDesc}>
        <Text style={s.agentDescText}>
          {AGENTS.find((a) => a.id === agent)?.desc}
        </Text>
        {messages.length > 0 && (
          <Pressable onPress={() => setMessages([])}>
            <Text style={s.clearBtn}>Clear</Text>
          </Pressable>
        )}
      </View>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={s.messages}
        contentContainerStyle={s.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {loadingHx ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={BRAND} />
          </View>
        ) : isEmpty ? (
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>
              {AGENTS.find((a) => a.id === agent)?.icon}
            </Text>
            <Text style={s.emptyTitle}>
              {AGENTS.find((a) => a.id === agent)?.label}
            </Text>
            <Text style={s.emptyDesc}>
              {AGENTS.find((a) => a.id === agent)?.desc}
            </Text>
            {/* Starter chips */}
            <View style={s.starters}>
              {starters.map((q) => (
                <Pressable key={q} style={s.starterChip} onPress={() => send(q)}>
                  <Text style={s.starterText}>{q}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          messages.map((msg, i) => (
            <View key={i} style={msg.role === "user" ? s.userBubbleWrap : s.aiBubbleWrap}>
              {msg.role === "assistant" && (
                <View style={s.aiAvatar}>
                  <Text style={s.aiAvatarText}>
                    {AGENTS.find((a) => a.id === agent)?.icon ?? "🤖"}
                  </Text>
                </View>
              )}
              <View style={[
                s.bubble,
                msg.role === "user" ? s.userBubble : s.aiBubble,
              ]}>
                <Text style={msg.role === "user" ? s.userBubbleText : s.aiBubbleText}>
                  {msg.content}
                </Text>
                {/* Suggested workout pill */}
                {msg.suggestedWorkout && (
                  <View style={s.suggestionPill}>
                    <Text style={s.suggestionPillText}>
                      🏋️ Suggested workout included — save it in Workouts
                    </Text>
                  </View>
                )}
                {/* Suggested meal plan pill */}
                {msg.suggestedMealPlan && (
                  <View style={[s.suggestionPill, { backgroundColor: "#052e16" }]}>
                    <Text style={[s.suggestionPillText, { color: "#4ade80" }]}>
                      🥗 Suggested meal plan included — save it in Nutrition
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        {/* Typing indicator */}
        {sending && (
          <View style={s.aiBubbleWrap}>
            <View style={s.aiAvatar}>
              <Text style={s.aiAvatarText}>
                {AGENTS.find((a) => a.id === agent)?.icon ?? "🤖"}
              </Text>
            </View>
            <View style={[s.bubble, s.aiBubble, s.typingBubble]}>
              <ActivityIndicator size="small" color="#9ca3af" />
            </View>
          </View>
        )}

        {/* Starter chips inline if there are messages */}
        {!isEmpty && !sending && messages[messages.length - 1]?.role === "assistant" && (
          <View style={s.inlineStarters}>
            {starters.slice(0, 2).map((q) => (
              <Pressable key={q} style={s.inlineChip} onPress={() => send(q)}>
                <Text style={s.inlineChipText}>{q}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── Input bar ──────────────────────────────────────────────────── */}
      <View style={s.inputBar}>
        <TextInput
          style={s.input}
          placeholder={`Ask your ${AGENTS.find((a) => a.id === agent)?.label}…`}
          placeholderTextColor="#6b7280"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          returnKeyType="default"
          blurOnSubmit={false}
        />
        <Pressable
          style={[s.sendBtn, (!input.trim() || sending) && s.sendBtnDisabled]}
          onPress={() => send()}
          disabled={!input.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.sendBtnText}>↑</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const BRAND   = "#16a34a";
const BG      = "#111827";
const SURFACE = "#1f2937";
const BORDER  = "#374151";

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },

  agentBar:     { flexDirection: "row", backgroundColor: SURFACE,
                  paddingHorizontal: 12, paddingTop: 52, paddingBottom: 6,
                  borderBottomWidth: 1, borderBottomColor: BORDER, gap: 4 },
  agentTab:     { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12 },
  agentTabActive:{ backgroundColor: "#052e16" },
  agentTabIcon: { fontSize: 18 },
  agentTabLabel:{ color: "#6b7280", fontSize: 11, fontWeight: "600", marginTop: 3 },
  agentTabLabelActive: { color: BRAND },

  agentDesc:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  paddingHorizontal: 16, paddingVertical: 8,
                  borderBottomWidth: 1, borderBottomColor: BORDER },
  agentDescText:{ color: "#6b7280", fontSize: 12 },
  clearBtn:     { color: "#4b5563", fontSize: 12, fontWeight: "600" },

  messages:     { flex: 1 },
  messagesContent: { paddingHorizontal: 12, paddingTop: 16 },

  loadingWrap:  { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },

  emptyWrap:    { alignItems: "center", paddingTop: 40, paddingHorizontal: 16 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { color: "#f9fafb", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptyDesc:    { color: "#6b7280", fontSize: 14, textAlign: "center", marginBottom: 24 },

  starters:     { width: "100%", gap: 8 },
  starterChip:  { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  starterText:  { color: "#d1d5db", fontSize: 13 },

  userBubbleWrap:{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 10 },
  aiBubbleWrap: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 10 },

  aiAvatar:     { width: 30, height: 30, backgroundColor: SURFACE, borderRadius: 15,
                  alignItems: "center", justifyContent: "center", marginBottom: 2 },
  aiAvatarText: { fontSize: 16 },

  bubble:       { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble:   { backgroundColor: BRAND, borderBottomRightRadius: 4 },
  aiBubble:     { backgroundColor: SURFACE, borderBottomLeftRadius: 4 },
  userBubbleText:{ color: "#fff", fontSize: 14, lineHeight: 20 },
  aiBubbleText: { color: "#f9fafb", fontSize: 14, lineHeight: 20 },

  typingBubble: { paddingVertical: 14, paddingHorizontal: 16 },

  suggestionPill:{ backgroundColor: "#1c1917", borderRadius: 8,
                   paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 },
  suggestionPillText: { color: "#fb923c", fontSize: 11, fontWeight: "500" },

  inlineStarters:{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginLeft: 38, marginBottom: 8 },
  inlineChip:   { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
                  borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  inlineChipText:{ color: "#9ca3af", fontSize: 12 },

  inputBar:     { flexDirection: "row", alignItems: "flex-end", gap: 8,
                  paddingHorizontal: 12, paddingVertical: 10,
                  borderTopWidth: 1, borderTopColor: BORDER,
                  backgroundColor: SURFACE },
  input:        { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: BG,
                  borderWidth: 1, borderColor: BORDER, borderRadius: 22,
                  paddingHorizontal: 16, paddingVertical: 10,
                  color: "#f9fafb", fontSize: 14 },
  sendBtn:      { width: 44, height: 44, backgroundColor: BRAND, borderRadius: 22,
                  alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: "#374151" },
  sendBtnText:  { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: -2 },
});
