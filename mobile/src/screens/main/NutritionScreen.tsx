import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  RefreshControl, ActivityIndicator, Modal, KeyboardAvoidingView,
  Platform, FlatList,
} from "react-native";
import { foodApi, searchApi } from "../../api";
import type { FoodLog, FoodTotals } from "@shared/types";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEALS: { id: MealType; label: string; icon: string }[] = [
  { id: "breakfast", label: "Breakfast", icon: "🌅" },
  { id: "lunch",     label: "Lunch",     icon: "☀️" },
  { id: "dinner",    label: "Dinner",    icon: "🌙" },
  { id: "snack",     label: "Snack",     icon: "🍎" },
];

function MacroChip({ label, value, target, color }: {
  label: string; value: number; target?: number; color: string;
}) {
  return (
    <View style={s.macroChip}>
      <View style={[s.macroChipDot, { backgroundColor: color }]} />
      <Text style={s.macroChipVal}>{Math.round(value)}g</Text>
      {target ? <Text style={s.macroChipTarget}>/{Math.round(target)}g</Text> : null}
      <Text style={s.macroChipLabel}>{label}</Text>
    </View>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={s.pbTrack}>
      <View style={[s.pbFill, { width: `${Math.min(100, Math.max(0, pct))}%` as any, backgroundColor: color }]} />
    </View>
  );
}

export function NutritionScreen() {
  const [logs,      setLogs]      = useState<FoodLog[]>([]);
  const [totals,    setTotals]    = useState<FoodTotals>({ calories: 0, protein: 0, carbs: 0, fats: 0 });
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  // Log modal state
  const [showModal,  setShowModal]  = useState(false);
  const [mealType,   setMealType]   = useState<MealType>("breakfast");
  const [searchQ,    setSearchQ]    = useState("");
  const [results,    setResults]    = useState<any[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [selected,   setSelected]   = useState<any | null>(null);
  const [qty,        setQty]        = useState("100");
  const [saving,     setSaving]     = useState(false);

  const loadToday = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await foodApi.getToday();
      setLogs(res.data.logs);
      setTotals(res.data.totals);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadToday(); }, [loadToday]);

  const onRefresh = () => { setRefreshing(true); loadToday(true); };

  // Debounced food search
  useEffect(() => {
    if (!searchQ.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchApi.foods(searchQ, 15);
        setResults(res.data.results);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQ]);

  const openModal = (meal: MealType) => {
    setMealType(meal);
    setSearchQ("");
    setResults([]);
    setSelected(null);
    setQty("100");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    const quantity = parseFloat(qty);
    if (isNaN(quantity) || quantity <= 0) return;
    const scale = quantity / (selected.servingSize ?? 100);
    setSaving(true);
    try {
      await foodApi.log({
        foodName: selected.name,
        calories: Math.round((selected.calories ?? 0) * scale),
        protein:  Math.round((selected.protein  ?? 0) * scale),
        carbs:    Math.round((selected.carbs    ?? 0) * scale),
        fats:     Math.round((selected.fats     ?? 0) * scale),
        quantity,
        unit: selected.unit ?? "g",
        meal: mealType,
      });
      setShowModal(false);
      loadToday(true);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await foodApi.delete(id);
      loadToday(true);
    } catch { /* silent */ }
  };

  const logsByMeal = (meal: MealType) => logs.filter((l) => l.meal === meal);
  const calorieTarget = 2000; // fallback — ideally pull from activeGoal

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Nutrition</Text>
          <Text style={s.headerDate}>
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </Text>
        </View>

        {/* ── Calorie summary card ───────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.calRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.calBig}>{Math.round(totals.calories)}</Text>
              <Text style={s.calLabel}>kcal today</Text>
            </View>
            <View style={s.calRight}>
              <Text style={s.calTarget}>{calorieTarget}</Text>
              <Text style={s.calTargetLabel}>target</Text>
            </View>
            <View style={s.calRight}>
              <Text style={[s.calTarget, { color: calorieTarget - totals.calories < 0 ? "#ef4444" : BRAND }]}>
                {Math.abs(Math.round(calorieTarget - totals.calories))}
              </Text>
              <Text style={s.calTargetLabel}>
                {calorieTarget - totals.calories < 0 ? "over" : "left"}
              </Text>
            </View>
          </View>
          <ProgressBar
            pct={(totals.calories / calorieTarget) * 100}
            color={totals.calories > calorieTarget ? "#ef4444" : BRAND}
          />

          {/* Macros row */}
          <View style={s.macrosRow}>
            <MacroChip label="Protein" value={totals.protein} color="#3b82f6" />
            <MacroChip label="Carbs"   value={totals.carbs}   color="#eab308" />
            <MacroChip label="Fats"    value={totals.fats}    color="#ef4444" />
          </View>
        </View>

        {/* ── Meal sections ──────────────────────────────────────────────── */}
        {MEALS.map((meal) => {
          const mealLogs   = logsByMeal(meal.id);
          const mealCals   = mealLogs.reduce((s, l) => s + l.calories, 0);
          const mealProtein= mealLogs.reduce((s, l) => s + (l.protein ?? 0), 0);
          return (
            <View key={meal.id} style={s.card}>
              {/* Meal header */}
              <View style={s.mealHeader}>
                <View style={s.mealLeft}>
                  <Text style={s.mealIcon}>{meal.icon}</Text>
                  <View>
                    <Text style={s.mealLabel}>{meal.label}</Text>
                    {mealLogs.length > 0 && (
                      <Text style={s.mealMeta}>
                        {Math.round(mealCals)} kcal · {Math.round(mealProtein)}g protein
                      </Text>
                    )}
                  </View>
                </View>
                <Pressable style={s.addBtn} onPress={() => openModal(meal.id)}>
                  <Text style={s.addBtnText}>+ Add</Text>
                </Pressable>
              </View>

              {/* Food items */}
              {mealLogs.length > 0 ? (
                mealLogs.map((log) => (
                  <View key={log.id} style={s.foodRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.foodName}>{log.foodName}</Text>
                      <Text style={s.foodMeta}>
                        {log.quantity}{log.unit} · {Math.round(log.calories)} kcal
                        {log.protein ? ` · ${Math.round(log.protein)}g P` : ""}
                      </Text>
                    </View>
                    <Pressable onPress={() => handleDelete(log.id)} style={s.deleteBtn}>
                      <Text style={s.deleteBtnText}>✕</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={s.emptyMeal}>Nothing logged yet</Text>
              )}
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Log Food Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={s.modal}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Modal header */}
          <View style={s.modalHeader}>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={s.modalClose}>✕</Text>
            </Pressable>
            <Text style={s.modalTitle}>
              Log {MEALS.find((m) => m.id === mealType)?.icon}{" "}
              {MEALS.find((m) => m.id === mealType)?.label}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Meal type pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mealPills}>
            {MEALS.map((m) => (
              <Pressable
                key={m.id}
                style={[s.mealPill, mealType === m.id && s.mealPillActive]}
                onPress={() => setMealType(m.id)}
              >
                <Text style={[s.mealPillText, mealType === m.id && s.mealPillTextActive]}>
                  {m.icon} {m.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Search */}
          <View style={s.searchWrap}>
            <TextInput
              style={s.searchInput}
              placeholder="Search foods…"
              placeholderTextColor="#6b7280"
              value={searchQ}
              onChangeText={setSearchQ}
              autoFocus
            />
            {searching && <ActivityIndicator color={BRAND} style={{ marginLeft: 10 }} />}
          </View>

          {/* Selected food detail */}
          {selected ? (
            <View style={s.selectedCard}>
              <View style={s.selectedHeader}>
                <Text style={s.selectedName}>{selected.name}</Text>
                <Pressable onPress={() => setSelected(null)}>
                  <Text style={s.selectedClear}>Change</Text>
                </Pressable>
              </View>
              <Text style={s.selectedMacros}>
                Per 100g · {Math.round(selected.calories ?? 0)} kcal · {Math.round(selected.protein ?? 0)}g P
                · {Math.round(selected.carbs ?? 0)}g C · {Math.round(selected.fats ?? 0)}g F
              </Text>
              <View style={s.qtyRow}>
                <Text style={s.qtyLabel}>Quantity (g)</Text>
                <TextInput
                  style={s.qtyInput}
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              {/* Preview */}
              {(() => {
                const scale = (parseFloat(qty) || 0) / (selected.servingSize ?? 100);
                return (
                  <View style={s.previewRow}>
                    <Text style={s.previewItem}>
                      <Text style={s.previewBold}>{Math.round((selected.calories ?? 0) * scale)}</Text> kcal
                    </Text>
                    <Text style={s.previewItem}>
                      <Text style={s.previewBold}>{Math.round((selected.protein ?? 0) * scale)}</Text>g P
                    </Text>
                    <Text style={s.previewItem}>
                      <Text style={s.previewBold}>{Math.round((selected.carbs ?? 0) * scale)}</Text>g C
                    </Text>
                    <Text style={s.previewItem}>
                      <Text style={s.previewBold}>{Math.round((selected.fats ?? 0) * scale)}</Text>g F
                    </Text>
                  </View>
                );
              })()}
              <Pressable
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.saveBtnText}>Log Food</Text>
                }
              </Pressable>
            </View>
          ) : (
            /* Search results */
            <FlatList
              data={results}
              keyExtractor={(_, i) => String(i)}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              renderItem={({ item }) => (
                <Pressable style={s.resultRow} onPress={() => setSelected(item)}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.resultName}>{item.name}</Text>
                    <Text style={s.resultMeta}>
                      {Math.round(item.calories ?? 0)} kcal · {Math.round(item.protein ?? 0)}g P
                      {item.brand ? ` · ${item.brand}` : ""}
                    </Text>
                  </View>
                  <Text style={s.resultArrow}>→</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                searchQ.trim() && !searching ? (
                  <Text style={s.noResults}>No foods found for "{searchQ}"</Text>
                ) : null
              }
            />
          )}
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

  header:       { marginBottom: 20 },
  headerTitle:  { color: "#f9fafb", fontSize: 22, fontWeight: "700" },
  headerDate:   { color: "#6b7280", fontSize: 13, marginTop: 3 },

  card:         { backgroundColor: SURFACE, borderRadius: 18, padding: 16, marginBottom: 14 },

  calRow:       { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 16 },
  calBig:       { color: "#f9fafb", fontSize: 36, fontWeight: "800" },
  calLabel:     { color: "#6b7280", fontSize: 12 },
  calRight:     { alignItems: "center" },
  calTarget:    { color: "#f9fafb", fontSize: 18, fontWeight: "700" },
  calTargetLabel:{ color: "#6b7280", fontSize: 11 },

  pbTrack:      { height: 8, backgroundColor: BORDER, borderRadius: 4, overflow: "hidden" },
  pbFill:       { height: "100%", borderRadius: 4 },

  macrosRow:    { flexDirection: "row", justifyContent: "space-around", marginTop: 14 },
  macroChip:    { alignItems: "center", gap: 3 },
  macroChipDot: { width: 8, height: 8, borderRadius: 4 },
  macroChipVal: { color: "#f9fafb", fontSize: 14, fontWeight: "700" },
  macroChipTarget:{ color: "#4b5563", fontSize: 10 },
  macroChipLabel: { color: "#6b7280", fontSize: 11 },

  mealHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  mealLeft:     { flexDirection: "row", alignItems: "center", gap: 10 },
  mealIcon:     { fontSize: 20 },
  mealLabel:    { color: "#f9fafb", fontSize: 15, fontWeight: "700" },
  mealMeta:     { color: "#6b7280", fontSize: 11, marginTop: 2 },

  addBtn:       { backgroundColor: "#052e16", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText:   { color: BRAND, fontSize: 13, fontWeight: "600" },

  foodRow:      { flexDirection: "row", alignItems: "center", paddingVertical: 8,
                  borderTopWidth: 1, borderTopColor: BG, gap: 8 },
  foodName:     { color: "#f9fafb", fontSize: 13, fontWeight: "500" },
  foodMeta:     { color: "#6b7280", fontSize: 11, marginTop: 2 },
  deleteBtn:    { width: 28, height: 28, alignItems: "center", justifyContent: "center",
                  backgroundColor: "#450a0a", borderRadius: 8 },
  deleteBtnText:{ color: "#ef4444", fontSize: 12, fontWeight: "700" },

  emptyMeal:    { color: "#374151", fontSize: 12, paddingTop: 4 },

  // Modal
  modal:        { flex: 1, backgroundColor: BG },
  modalHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
                  borderBottomWidth: 1, borderBottomColor: BORDER },
  modalClose:   { color: "#6b7280", fontSize: 16, fontWeight: "600", padding: 4 },
  modalTitle:   { color: "#f9fafb", fontSize: 16, fontWeight: "700" },

  mealPills:    { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  mealPill:     { borderRadius: 20, borderWidth: 1, borderColor: BORDER,
                  paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  mealPillActive:{ backgroundColor: "#052e16", borderColor: BRAND },
  mealPillText: { color: "#6b7280", fontSize: 13 },
  mealPillTextActive: { color: BRAND, fontWeight: "600" },

  searchWrap:   { flexDirection: "row", alignItems: "center",
                  paddingHorizontal: 16, paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: BORDER },
  searchInput:  { flex: 1, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER,
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
                  color: "#f9fafb", fontSize: 14 },

  selectedCard: { margin: 16, backgroundColor: SURFACE, borderRadius: 16, padding: 16 },
  selectedHeader:{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  selectedName: { color: "#f9fafb", fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  selectedClear:{ color: BRAND, fontSize: 13, fontWeight: "600" },
  selectedMacros:{ color: "#6b7280", fontSize: 12, marginBottom: 16 },

  qtyRow:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  qtyLabel:     { color: "#d1d5db", fontSize: 14 },
  qtyInput:     { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 8, color: "#f9fafb", fontSize: 16,
                  minWidth: 80, textAlign: "center" },

  previewRow:   { flexDirection: "row", justifyContent: "space-around",
                  backgroundColor: BG, borderRadius: 12, paddingVertical: 10, marginBottom: 16 },
  previewItem:  { color: "#9ca3af", fontSize: 13 },
  previewBold:  { color: "#f9fafb", fontWeight: "700" },

  saveBtn:      { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  saveBtnText:  { color: "#fff", fontWeight: "700", fontSize: 15 },

  resultRow:    { flexDirection: "row", alignItems: "center",
                  paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  resultName:   { color: "#f9fafb", fontSize: 14, fontWeight: "500" },
  resultMeta:   { color: "#6b7280", fontSize: 12, marginTop: 2 },
  resultArrow:  { color: "#4b5563", fontSize: 16, marginLeft: 8 },

  noResults:    { color: "#4b5563", textAlign: "center", paddingTop: 30, fontSize: 14 },
});
