import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, RefreshControl,
  ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { dashboardApi, weightApi, calorieGoalsApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import type { DashboardData } from "@shared/types";
import type { TabParamList } from "../../navigation/TabNavigator";

type Nav = BottomTabNavigationProp<TabParamList>;

// ── Date helpers ───────────────────────────────────────────────────────────────
function fmtDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtDateLong() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, bg, icon }: {
  label: string; value: string; sub?: string; bg: string; icon: string;
}) {
  return (
    <View style={[s.statCard, { backgroundColor: bg }]}>
      <View style={s.statRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.statLabel}>{label}</Text>
          <Text style={s.statValue}>{value}</Text>
          {sub ? <Text style={s.statSub}>{sub}</Text> : null}
        </View>
        <Text style={s.statIcon}>{icon}</Text>
      </View>
    </View>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const clampedPct = Math.min(100, Math.max(0, pct));
  return (
    <View style={s.pbTrack}>
      <View style={[s.pbFill, { width: `${clampedPct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

// ── Macro row ──────────────────────────────────────────────────────────────────
function MacroRow({ label, value, target, color }: {
  label: string; value: number; target?: number; color: string;
}) {
  const pct = target ? (value / target) * 100 : 0;
  return (
    <View style={s.macroRow}>
      <View style={s.macroHeader}>
        <Text style={s.macroLabel}>{label}</Text>
        <Text style={s.macroValue}>
          {Math.round(value)}g{target ? ` / ${Math.round(target)}g` : ""}
        </Text>
      </View>
      <ProgressBar pct={pct} color={color} />
    </View>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, onAction, actionLabel }: {
  title: string; onAction?: () => void; actionLabel?: string;
}) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onAction && (
        <Pressable onPress={onAction}>
          <Text style={s.sectionAction}>{actionLabel ?? "View all →"}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export function DashboardScreen() {
  const { user }   = useAuthStore();
  const navigation = useNavigation<Nav>();

  const [data,       setData]       = useState<DashboardData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projection, setProjection] = useState<{ projected: any[] } | null>(null);

  // Weight modal
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightVal,       setWeightVal]       = useState("");
  const [savingWeight,    setSavingWeight]    = useState(false);
  const [weightSaved,     setWeightSaved]     = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await dashboardApi.get();
      setData(res.data);
      if (res.data.activeGoal) {
        calorieGoalsApi.getProjection(res.data.activeGoal.id)
          .then((pr) => setProjection({ projected: pr.data.projected }))
          .catch(() => {});
      }
    } catch { /* silent fail */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleLogWeight = async () => {
    const w = parseFloat(weightVal);
    if (isNaN(w) || w <= 0) return;
    setSavingWeight(true);
    try {
      await weightApi.log({ weight: w });
      setWeightSaved(true);
      setWeightVal("");
      setTimeout(() => {
        setShowWeightModal(false);
        setWeightSaved(false);
        load(true);
      }, 900);
    } catch { /* silent */ }
    finally { setSavingWeight(false); }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const {
    today, weightLogs, recentWorkouts, weeklyWorkoutCount,
    activeGoal, effectiveCalorieTarget, water, streaks,
  } = data ?? {
    today: { totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }, logs: [], date: "", hasWorkout: false },
    weightLogs: [], recentWorkouts: [], weeklyWorkoutCount: 0,
    activeGoal: null, effectiveCalorieTarget: null,
    water: { totalMl: 0, targetMl: 2000, logs: [] },
    streaks: { workout: 0, workoutBest: 0, nutrition: 0, restDays: null, cheatMealsThisWeek: 0 },
  };

  const calories      = today.totals.calories ?? 0;
  const calorieTarget = effectiveCalorieTarget ?? activeGoal?.dailyCalories ?? 2000;
  const caloriePct    = Math.min(100, Math.round((calories / calorieTarget) * 100));
  const caloriesLeft  = Math.round(calorieTarget - calories);
  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : null;

  const caloriesBurnedToday = recentWorkouts
    .filter((w) => w.date.startsWith(todayStr()) && w.caloriesBurned)
    .reduce((sum, w) => sum + (w.caloriesBurned ?? 0), 0);

  // Projection status
  const projectionStatus = (() => {
    if (!projection?.projected?.length || !activeGoal || currentWeight == null) return null;
    const today_ = todayStr();
    let closest: any = null, closestDiff = Infinity;
    for (const p of projection.projected) {
      const pDate = p.date ? p.date.substring(0, 10) : today_;
      const diff  = Math.abs(new Date(pDate).getTime() - new Date(today_).getTime());
      if (diff < closestDiff) { closestDiff = diff; closest = p; }
    }
    if (!closest) return null;
    const delta = currentWeight - closest.projectedWeight;
    const threshold = 0.5;
    const isAhead   = activeGoal.type === "cut" ? delta < -threshold : delta > threshold;
    const isBehind  = activeGoal.type === "cut" ? delta > threshold  : delta < -threshold;
    if (isAhead)  return { label: "🚀 Ahead of Schedule", bg: "#052e16", color: "#4ade80" };
    if (isBehind) return { label: "⚠️ Slightly Behind",   bg: "#422006", color: "#fbbf24" };
    return           { label: "✅ On Track",               bg: "#172554", color: "#60a5fa" };
  })();

  const waterPct = Math.min(100, ((water?.totalMl ?? 0) / (water?.targetMl ?? 2000)) * 100);
  const waterL   = ((water?.totalMl ?? 0) / 1000).toFixed(1);
  const targetL  = ((water?.targetMl ?? 2000) / 1000).toFixed(1);
  const displayName = user?.firstName || user?.username;

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.headerGreeting}>{greeting()}, {displayName} 👋</Text>
          <Text style={s.headerDate}>{fmtDateLong()}</Text>
        </View>

        {/* ── Stat cards 2×2 ─────────────────────────────────────────────── */}
        <View style={s.grid2}>
          <StatCard
            label="Calories Today"
            value={`${Math.round(calories)}`}
            sub={`of ${Math.round(calorieTarget)} kcal`}
            bg="#c2410c"
            icon="🔥"
          />
          <StatCard
            label="Protein Today"
            value={`${Math.round(today.totals.protein ?? 0)}g`}
            sub={activeGoal ? `of ${Math.round(activeGoal.proteinGrams)}g` : "today"}
            bg="#1d4ed8"
            icon="💪"
          />
          <StatCard
            label="Current Weight"
            value={currentWeight != null ? `${currentWeight}kg` : "—"}
            sub={activeGoal ? `target: ${activeGoal.targetWeight}kg` : "tap ⚖️ to log"}
            bg="#6d28d9"
            icon="⚖️"
          />
          <StatCard
            label="Workouts/Week"
            value={`${weeklyWorkoutCount}`}
            sub="last 7 days"
            bg={BRAND}
            icon="🏋️"
          />
        </View>

        {/* ── Calorie progress card ───────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader title="Today's Calories" />

          <View style={s.calorieCenter}>
            <Text style={s.caloriePct}>{caloriePct}%</Text>
            <Text style={s.calorieKcal}>{Math.round(calories)} kcal consumed</Text>
            <Text style={[s.calorieRemain, { color: caloriesLeft < 0 ? "#ef4444" : BRAND }]}>
              {caloriesLeft >= 0
                ? `${caloriesLeft} kcal remaining`
                : `${Math.abs(caloriesLeft)} kcal over target`}
            </Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <ProgressBar pct={caloriePct} color={caloriePct >= 100 ? "#ef4444" : BRAND} />
          </View>

          {caloriesBurnedToday > 0 && (
            <View style={s.burnedRow}>
              <Text style={s.burnedText}>🔥 Burned today</Text>
              <Text style={s.burnedValue}>−{Math.round(caloriesBurnedToday)} kcal</Text>
            </View>
          )}

          {!activeGoal && (
            <Pressable style={s.noGoalBanner} onPress={() => navigation.navigate("More")}>
              <View>
                <Text style={s.noGoalTitle}>No calorie goal set</Text>
                <Text style={s.noGoalSub}>Set a goal to track your progress</Text>
              </View>
              <Text style={s.noGoalArrow}>→</Text>
            </Pressable>
          )}

          <View style={s.divider} />

          <MacroRow label="Protein" value={today.totals.protein ?? 0} target={activeGoal?.proteinGrams} color="#3b82f6" />
          <MacroRow label="Carbs"   value={today.totals.carbs   ?? 0} target={activeGoal?.carbsGrams}   color="#eab308" />
          <MacroRow label="Fats"    value={today.totals.fats    ?? 0} target={activeGoal?.fatsGrams}    color="#ef4444" />

          {activeGoal?.macrosCycling && (
            <View style={{ alignItems: "center", marginTop: 10 }}>
              <View style={[s.badge, { backgroundColor: today.hasWorkout ? "#1e1b4b" : "#1e293b" }]}>
                <Text style={[s.badgeText, { color: today.hasWorkout ? "#818cf8" : "#94a3b8" }]}>
                  {today.hasWorkout ? "🏋️ Training Day Macros" : "😴 Rest Day Macros"}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Streaks + Water ─────────────────────────────────────────────── */}
        <View style={s.grid2}>
          <View style={s.card}>
            <Text style={[s.streakValue, { color: "#f97316" }]}>🔥 {streaks?.workout ?? 0}</Text>
            <Text style={s.streakLabel}>Workout streak</Text>
            {(streaks?.workoutBest ?? 0) > 0 && (
              <Text style={s.streakSub}>Best: {streaks!.workoutBest} days</Text>
            )}
          </View>
          <View style={s.card}>
            <Text style={[s.streakValue, { color: BRAND }]}>🥗 {streaks?.nutrition ?? 0}</Text>
            <Text style={s.streakLabel}>Nutrition streak</Text>
            {(streaks?.cheatMealsThisWeek ?? 0) > 0 && (
              <Text style={s.streakSub}>🍕 {streaks!.cheatMealsThisWeek} cheat this week</Text>
            )}
          </View>
          <View style={s.card}>
            <Text style={[s.streakValue, { color: "#a855f7" }]}>
              😴 {streaks?.restDays != null ? streaks!.restDays : "—"}
            </Text>
            <Text style={s.streakLabel}>Days since workout</Text>
            {today.hasWorkout && (
              <Text style={[s.streakSub, { color: BRAND }]}>✅ Trained today</Text>
            )}
          </View>
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
              <Text style={[s.streakValue, { color: "#0ea5e9" }]}>💧 {waterL}L</Text>
              <Text style={s.streakSub}>/ {targetL}L</Text>
            </View>
            <ProgressBar pct={waterPct} color="#38bdf8" />
            <Text style={[s.streakLabel, { marginTop: 6 }]}>Water today</Text>
          </View>
        </View>

        {/* ── Weight Progress ─────────────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader
            title="Weight Progress"
            onAction={() => setShowWeightModal(true)}
            actionLabel="+ Log ⚖️"
          />
          {currentWeight != null && activeGoal ? (
            <>
              <View style={s.weightRow}>
                <View style={s.weightStat}>
                  <Text style={s.weightStatVal}>{currentWeight}kg</Text>
                  <Text style={s.weightStatLabel}>Current</Text>
                </View>
                <Text style={s.weightArrow}>→</Text>
                <View style={s.weightStat}>
                  <Text style={[s.weightStatVal, { color: BRAND }]}>{activeGoal.targetWeight}kg</Text>
                  <Text style={s.weightStatLabel}>Target</Text>
                </View>
                <Text style={s.weightArrow}>by</Text>
                <View style={s.weightStat}>
                  <Text style={s.weightStatVal}>{fmtDateShort(activeGoal.targetDate)}</Text>
                  <Text style={s.weightStatLabel}>Date</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ color: "#9ca3af", fontSize: 13 }}>
                  {Math.abs(currentWeight - activeGoal.targetWeight).toFixed(1)} kg to go
                </Text>
                {projectionStatus && (
                  <View style={[s.badge, { backgroundColor: projectionStatus.bg }]}>
                    <Text style={[s.badgeText, { color: projectionStatus.color }]}>
                      {projectionStatus.label}
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : currentWeight != null ? (
            <Text style={{ color: "#9ca3af", fontSize: 14, marginBottom: 12 }}>
              Latest: {currentWeight}kg
            </Text>
          ) : (
            <Pressable style={s.emptyState} onPress={() => setShowWeightModal(true)}>
              <Text style={s.emptyIcon}>⚖️</Text>
              <Text style={s.emptyText}>No weight data yet</Text>
              <Text style={s.emptyAction}>Tap to log your weight</Text>
            </Pressable>
          )}

          {weightLogs.length > 0 && (
            <View style={s.weightList}>
              {[...weightLogs].reverse().slice(0, 5).map((log, i) => (
                <View key={`${log.id}-${i}`} style={s.weightListRow}>
                  <Text style={s.weightListDate}>{fmtDateShort(log.date)}</Text>
                  <Text style={s.weightListVal}>{log.weight} kg</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Active Goal ──────────────────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader title="Active Goal" />
          {activeGoal ? (
            <>
              <View style={s.goalRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.goalName}>{activeGoal.name || "My Goal"}</Text>
                  <Text style={s.goalSub}>
                    {activeGoal.currentWeight}kg → {activeGoal.targetWeight}kg ·{" "}
                    {activeGoal.type === "cut" ? "Cutting" : activeGoal.type === "bulk" ? "Bulking" : "Maintaining"}
                  </Text>
                </View>
                <View style={[s.badge, {
                  backgroundColor:
                    activeGoal.type === "cut"  ? "#172554" :
                    activeGoal.type === "bulk" ? "#052e16" : "#1f2937",
                }]}>
                  <Text style={[s.badgeText, {
                    color:
                      activeGoal.type === "cut"  ? "#60a5fa" :
                      activeGoal.type === "bulk" ? "#4ade80" : "#9ca3af",
                  }]}>
                    {activeGoal.type === "cut" ? "✂️ Cut" : activeGoal.type === "bulk" ? "📈 Bulk" : "⚖️ Maintain"}
                  </Text>
                </View>
              </View>
              <View style={s.goalStats}>
                {[
                  { label: "Calories", value: `${Math.round(effectiveCalorieTarget ?? activeGoal.dailyCalories)} kcal` },
                  { label: "Protein",  value: `${Math.round(activeGoal.proteinGrams)}g` },
                  { label: "Weekly",   value: `${activeGoal.weeklyChange > 0 ? "+" : ""}${activeGoal.weeklyChange}kg` },
                ].map((item) => (
                  <View key={item.label} style={s.goalStat}>
                    <Text style={s.goalStatLabel}>{item.label}</Text>
                    <Text style={s.goalStatVal}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>🎯</Text>
              <Text style={s.emptyText}>No active goal set</Text>
              <Text style={s.emptyAction}>Go to More to create one</Text>
            </View>
          )}
        </View>

        {/* ── Recent Workouts ─────────────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader title="Recent Workouts" onAction={() => navigation.navigate("Workouts")} />
          {recentWorkouts.length > 0 ? (
            recentWorkouts.slice(0, 4).map((w) => (
              <View key={w.id} style={s.workoutRow}>
                <View style={s.workoutAvatar}>
                  <Text style={s.workoutAvatarText}>{(w.name[0] ?? "W").toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.workoutName}>{w.name}</Text>
                  <Text style={s.workoutMeta}>
                    {fmtDateShort(w.date)} · {w.duration}min · {w.exercises.length} exercises
                  </Text>
                </View>
                {w.caloriesBurned ? (
                  <View style={s.workoutKcalBadge}>
                    <Text style={s.workoutKcalText}>{Math.round(w.caloriesBurned)} kcal</Text>
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <Pressable style={s.emptyState} onPress={() => navigation.navigate("Workouts")}>
              <Text style={s.emptyIcon}>🏋️</Text>
              <Text style={s.emptyText}>No workouts logged yet</Text>
              <Text style={s.emptyAction}>Tap to log your first workout</Text>
            </Pressable>
          )}
        </View>

        {/* ── Quick Actions ───────────────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHeader title="Quick Actions" />
          <View style={s.grid2}>
            {([
              { label: "AI Coach",      icon: "🤖", tab: "Chat"      },
              { label: "Log Nutrition", icon: "🥗", tab: "Nutrition" },
              { label: "Log Workout",   icon: "🏋️", tab: "Workouts"  },
              { label: "Settings",      icon: "⚙️", tab: "More"      },
            ] as const).map((a) => (
              <Pressable
                key={a.label}
                style={s.quickAction}
                onPress={() => navigation.navigate(a.tab)}
              >
                <Text style={s.qaIcon}>{a.icon}</Text>
                <Text style={s.qaLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Weight FAB ─────────────────────────────────────────────────────── */}
      <Pressable style={s.fab} onPress={() => setShowWeightModal(true)}>
        <Text style={s.fabText}>⚖️</Text>
      </Pressable>

      {/* ── Weight Modal ────────────────────────────────────────────────────── */}
      <Modal
        visible={showWeightModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>⚖️ Log Weight</Text>
            {weightSaved ? (
              <Text style={s.modalSaved}>✅ Saved!</Text>
            ) : (
              <>
                <View style={s.modalInputRow}>
                  <TextInput
                    style={s.modalInput}
                    placeholder="e.g. 80.5"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    value={weightVal}
                    onChangeText={setWeightVal}
                    onSubmitEditing={handleLogWeight}
                    autoFocus
                  />
                  <Text style={s.modalUnit}>kg</Text>
                </View>
                <View style={s.modalBtns}>
                  <Pressable
                    style={[s.modalBtn, s.modalBtnCancel]}
                    onPress={() => { setShowWeightModal(false); setWeightVal(""); }}
                  >
                    <Text style={s.modalBtnCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[s.modalBtn, s.modalBtnSave, savingWeight && { opacity: 0.6 }]}
                    onPress={handleLogWeight}
                    disabled={savingWeight}
                  >
                    {savingWeight
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.modalBtnSaveText}>Save</Text>
                    }
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const BRAND   = "#16a34a";
const BG      = "#111827";
const SURFACE = "#1f2937";
const BORDER  = "#374151";

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  center:       { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" },
  scroll:       { flex: 1 },
  scrollContent:{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },

  header:          { marginBottom: 20 },
  headerGreeting:  { color: "#f9fafb", fontSize: 22, fontWeight: "700" },
  headerDate:      { color: "#6b7280", fontSize: 13, marginTop: 3 },

  grid2:        { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },

  statCard:     { flex: 1, minWidth: "47%", borderRadius: 16, padding: 14 },
  statRow:      { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  statLabel:    { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "500" },
  statValue:    { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 4 },
  statSub:      { color: "rgba(255,255,255,0.55)", fontSize: 10, marginTop: 3 },
  statIcon:     { fontSize: 20, opacity: 0.85 },

  card:         { backgroundColor: SURFACE, borderRadius: 18, padding: 16, marginBottom: 14 },

  sectionHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: "#f9fafb", fontSize: 15, fontWeight: "700" },
  sectionAction:{ color: BRAND, fontSize: 13, fontWeight: "600" },

  calorieCenter:{ alignItems: "center", marginBottom: 12 },
  caloriePct:   { color: "#f9fafb", fontSize: 42, fontWeight: "800" },
  calorieKcal:  { color: "#9ca3af", fontSize: 14, marginTop: 2 },
  calorieRemain:{ fontSize: 13, fontWeight: "600", marginTop: 4 },

  pbTrack:      { height: 8, backgroundColor: "#374151", borderRadius: 4, overflow: "hidden" },
  pbFill:       { height: "100%", borderRadius: 4 },

  burnedRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  backgroundColor: "#431407", borderRadius: 10,
                  paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  burnedText:   { color: "#fb923c", fontSize: 12, fontWeight: "500" },
  burnedValue:  { color: "#f97316", fontSize: 12, fontWeight: "700" },

  noGoalBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  backgroundColor: "#451a03", borderWidth: 1, borderColor: "#78350f",
                  borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  noGoalTitle:  { color: "#fbbf24", fontSize: 12, fontWeight: "600" },
  noGoalSub:    { color: "#f59e0b", fontSize: 11, marginTop: 2 },
  noGoalArrow:  { color: "#f59e0b", fontSize: 16, fontWeight: "700" },

  divider:      { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  macroRow:     { marginBottom: 10 },
  macroHeader:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  macroLabel:   { color: "#9ca3af", fontSize: 12, fontWeight: "500" },
  macroValue:   { color: "#d1d5db", fontSize: 12, fontWeight: "600" },

  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:    { fontSize: 11, fontWeight: "600" },

  streakValue:  { fontSize: 18, fontWeight: "700" },
  streakLabel:  { color: "#6b7280", fontSize: 11, marginTop: 4 },
  streakSub:    { color: "#9ca3af", fontSize: 10, marginTop: 2 },

  weightRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginBottom: 12 },
  weightStat:   { alignItems: "center" },
  weightStatVal:{ color: "#f9fafb", fontSize: 16, fontWeight: "700" },
  weightStatLabel:{ color: "#6b7280", fontSize: 11, marginTop: 2 },
  weightArrow:  { color: "#4b5563", fontSize: 14 },
  weightList:   { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10, gap: 6 },
  weightListRow:{ flexDirection: "row", justifyContent: "space-between" },
  weightListDate:{ color: "#6b7280", fontSize: 12 },
  weightListVal: { color: "#d1d5db", fontSize: 12, fontWeight: "600" },

  goalRow:      { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  goalName:     { color: "#f9fafb", fontSize: 15, fontWeight: "700" },
  goalSub:      { color: "#6b7280", fontSize: 12, marginTop: 3 },
  goalStats:    { flexDirection: "row", gap: 8 },
  goalStat:     { flex: 1, backgroundColor: BG, borderRadius: 12, padding: 10, alignItems: "center" },
  goalStatLabel:{ color: "#6b7280", fontSize: 11 },
  goalStatVal:  { color: "#f9fafb", fontSize: 13, fontWeight: "700", marginTop: 3 },

  workoutRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8,
                  borderBottomWidth: 1, borderBottomColor: BG },
  workoutAvatar:{ width: 36, height: 36, backgroundColor: "#052e16", borderRadius: 10,
                  alignItems: "center", justifyContent: "center" },
  workoutAvatarText: { color: BRAND, fontWeight: "700", fontSize: 14 },
  workoutName:  { color: "#f9fafb", fontSize: 13, fontWeight: "600" },
  workoutMeta:  { color: "#6b7280", fontSize: 11, marginTop: 2 },
  workoutKcalBadge: { backgroundColor: "#431407", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  workoutKcalText:  { color: "#fb923c", fontSize: 11, fontWeight: "600" },

  quickAction:  { flex: 1, minWidth: "47%", backgroundColor: BG, borderRadius: 14,
                  padding: 14, alignItems: "center", gap: 6 },
  qaIcon:       { fontSize: 24 },
  qaLabel:      { color: "#d1d5db", fontSize: 12, fontWeight: "600", textAlign: "center" },

  emptyState:   { alignItems: "center", paddingVertical: 20 },
  emptyIcon:    { fontSize: 36, marginBottom: 8 },
  emptyText:    { color: "#6b7280", fontSize: 14 },
  emptyAction:  { color: BRAND, fontSize: 12, marginTop: 6, fontWeight: "600" },

  fab:          { position: "absolute", bottom: 90, right: 20,
                  width: 52, height: 52, backgroundColor: BRAND, borderRadius: 26,
                  alignItems: "center", justifyContent: "center",
                  shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  fabText:      { fontSize: 22 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", padding: 24 },
  modalBox:     { backgroundColor: SURFACE, borderRadius: 20, padding: 24 },
  modalTitle:   { color: "#f9fafb", fontSize: 17, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  modalSaved:   { color: BRAND, fontSize: 16, fontWeight: "600", textAlign: "center", paddingVertical: 12 },
  modalInputRow:{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  modalInput:   { flex: 1, backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                  color: "#f9fafb", fontSize: 16 },
  modalUnit:    { color: "#9ca3af", fontSize: 14, fontWeight: "500" },
  modalBtns:    { flexDirection: "row", gap: 10 },
  modalBtn:     { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  modalBtnCancel:     { backgroundColor: BORDER },
  modalBtnCancelText: { color: "#d1d5db", fontWeight: "600" },
  modalBtnSave:       { backgroundColor: BRAND },
  modalBtnSaveText:   { color: "#fff", fontWeight: "700" },
});
