import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, RefreshControl,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { workoutsApi } from "../../api";
import type { Workout } from "@shared/types";

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Workout card ────────────────────────────────────────────────────────────────
function WorkoutCard({ workout, onPress }: { workout: Workout; onPress: () => void }) {
  return (
    <Pressable style={s.workoutCard} onPress={onPress}>
      <View style={s.cardRow}>
        <View style={s.cardAvatar}>
          <Text style={s.cardAvatarText}>{(workout.name[0] ?? "W").toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName}>{workout.name}</Text>
          <Text style={s.cardMeta}>
            {fmtDateShort(workout.date)} · {workout.duration}min · {workout.exercises.length} exercises
          </Text>
          {workout.trainingType && (
            <Text style={s.cardType}>{workout.trainingType}</Text>
          )}
        </View>
        {workout.caloriesBurned ? (
          <View style={s.kcalBadge}>
            <Text style={s.kcalText}>{Math.round(workout.caloriesBurned)} kcal</Text>
          </View>
        ) : null}
      </View>
      {workout.exercises.length > 0 && (
        <Text style={s.cardExercises} numberOfLines={1}>
          {workout.exercises.slice(0, 4).map((e) => e.exerciseName).join(" · ")}
          {workout.exercises.length > 4 ? " …" : ""}
        </Text>
      )}
    </Pressable>
  );
}

// ── Log workout modal (quick log) ──────────────────────────────────────────────
function LogWorkoutModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [name,     setName]     = useState("");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [notes,    setNotes]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  const reset = () => { setName(""); setDuration(""); setCalories(""); setNotes(""); setError(""); };

  const save = async () => {
    if (!name.trim())            { setError("Workout name is required."); return; }
    const dur = parseInt(duration);
    if (isNaN(dur) || dur <= 0)  { setError("Enter a valid duration in minutes."); return; }
    setError(""); setSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await workoutsApi.create({
        name: name.trim(),
        date: today,
        duration: dur,
        caloriesBurned: calories ? parseFloat(calories) : undefined,
        notes: notes.trim() || undefined,
      });
      reset();
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to save workout.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modal} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={s.modalHeader}>
          <Pressable onPress={() => { reset(); onClose(); }}>
            <Text style={s.modalClose}>Cancel</Text>
          </Pressable>
          <Text style={s.modalTitle}>Log Workout</Text>
          <Pressable onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator color={BRAND} size="small" />
              : <Text style={s.modalSave}>Save</Text>
            }
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Text style={s.fieldLabel}>Workout Name *</Text>
          <TextInput
            style={s.fieldInput}
            placeholder="e.g. Push Day A"
            placeholderTextColor="#6b7280"
            value={name}
            onChangeText={setName}
          />

          <Text style={s.fieldLabel}>Duration (minutes) *</Text>
          <TextInput
            style={s.fieldInput}
            placeholder="e.g. 60"
            placeholderTextColor="#6b7280"
            keyboardType="numeric"
            value={duration}
            onChangeText={setDuration}
          />

          <Text style={s.fieldLabel}>Calories Burned (optional)</Text>
          <TextInput
            style={s.fieldInput}
            placeholder="e.g. 350"
            placeholderTextColor="#6b7280"
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
          />

          <Text style={s.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[s.fieldInput, { height: 80, textAlignVertical: "top" }]}
            placeholder="How did it go?"
            placeholderTextColor="#6b7280"
            multiline
            value={notes}
            onChangeText={setNotes}
          />

          <Text style={s.hintText}>
            💡 You can add individual exercises after saving.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Workout detail modal ─────────────────────────────────────────────────────
function WorkoutDetail({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  return (
    <Modal visible={!!workout} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={s.modal}>
        <View style={s.modalHeader}>
          <Pressable onPress={onClose}>
            <Text style={s.modalClose}>← Back</Text>
          </Pressable>
          <Text style={s.modalTitle} numberOfLines={1}>{workout.name}</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={s.modalContent}>
          {/* Meta */}
          <View style={s.detailMeta}>
            <View style={s.detailMetaItem}>
              <Text style={s.detailMetaVal}>{fmtDateShort(workout.date)}</Text>
              <Text style={s.detailMetaLabel}>Date</Text>
            </View>
            <View style={s.detailMetaItem}>
              <Text style={s.detailMetaVal}>{workout.duration}min</Text>
              <Text style={s.detailMetaLabel}>Duration</Text>
            </View>
            {workout.caloriesBurned ? (
              <View style={s.detailMetaItem}>
                <Text style={s.detailMetaVal}>{Math.round(workout.caloriesBurned)}</Text>
                <Text style={s.detailMetaLabel}>kcal burned</Text>
              </View>
            ) : null}
          </View>

          {workout.trainingType && (
            <View style={s.typeBadge}>
              <Text style={s.typeBadgeText}>{workout.trainingType}</Text>
            </View>
          )}

          {workout.notes && (
            <View style={s.notesBox}>
              <Text style={s.notesText}>{workout.notes}</Text>
            </View>
          )}

          {/* Exercises */}
          {workout.exercises.length > 0 && (
            <>
              <Text style={s.exercisesTitle}>Exercises ({workout.exercises.length})</Text>
              {workout.exercises.map((ex) => (
                <View key={ex.id} style={s.exerciseRow}>
                  <Text style={s.exerciseName}>{ex.exerciseName}</Text>
                  <Text style={s.exerciseMeta}>
                    {ex.sets} sets × {ex.reps} reps
                    {ex.weight ? ` @ ${ex.weight}kg` : ""}
                    {ex.rpe   ? ` · RPE ${ex.rpe}`   : ""}
                  </Text>
                  {ex.notes && <Text style={s.exerciseNote}>{ex.notes}</Text>}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export function WorkoutsScreen() {
  const [workouts,   setWorkouts]   = useState<Workout[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore,setLoadingMore]= useState(false);

  const [showLog,    setShowLog]    = useState(false);
  const [selected,   setSelected]   = useState<Workout | null>(null);

  const load = useCallback(async (p = 1, silent = false) => {
    if (p === 1 && !silent) setLoading(true);
    try {
      const res = await workoutsApi.getAll(p, 15);
      const d   = res.data;
      setTotalPages(d.pages);
      setWorkouts((prev) => p === 1 ? d.workouts : [...prev, ...d.workouts]);
      setPage(p);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(1, true); };
  const loadMore  = () => {
    if (page < totalPages && !loadingMore) {
      setLoadingMore(true);
      load(page + 1, true);
    }
  };

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
        onMomentumScrollEnd={(e) => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) {
            loadMore();
          }
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Workouts</Text>
            <Text style={s.headerSub}>{workouts.length > 0 ? `${workouts.length} sessions logged` : "Start tracking your training"}</Text>
          </View>
          <Pressable style={s.logBtn} onPress={() => setShowLog(true)}>
            <Text style={s.logBtnText}>+ Log</Text>
          </Pressable>
        </View>

        {/* ── Workout list ────────────────────────────────────────────────── */}
        {workouts.length > 0 ? (
          workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} onPress={() => setSelected(w)} />
          ))
        ) : (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🏋️</Text>
            <Text style={s.emptyTitle}>No workouts yet</Text>
            <Text style={s.emptySub}>Tap "+ Log" to record your first session</Text>
            <Pressable style={s.emptyBtn} onPress={() => setShowLog(true)}>
              <Text style={s.emptyBtnText}>Log Workout</Text>
            </Pressable>
          </View>
        )}

        {loadingMore && (
          <ActivityIndicator color={BRAND} style={{ marginVertical: 16 }} />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Log Workout Modal */}
      <LogWorkoutModal
        visible={showLog}
        onClose={() => setShowLog(false)}
        onSaved={() => { setShowLog(false); load(1, true); }}
      />

      {/* Workout detail */}
      {selected && (
        <WorkoutDetail workout={selected} onClose={() => setSelected(null)} />
      )}
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

  header:       { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  headerTitle:  { color: "#f9fafb", fontSize: 22, fontWeight: "700" },
  headerSub:    { color: "#6b7280", fontSize: 13, marginTop: 3 },
  logBtn:       { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  logBtnText:   { color: "#fff", fontWeight: "700", fontSize: 14 },

  workoutCard:  { backgroundColor: SURFACE, borderRadius: 16, padding: 14, marginBottom: 10 },
  cardRow:      { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  cardAvatar:   { width: 40, height: 40, backgroundColor: "#052e16", borderRadius: 12,
                  alignItems: "center", justifyContent: "center" },
  cardAvatarText:{ color: BRAND, fontWeight: "700", fontSize: 16 },
  cardName:     { color: "#f9fafb", fontSize: 15, fontWeight: "700" },
  cardMeta:     { color: "#6b7280", fontSize: 12, marginTop: 2 },
  cardType:     { color: "#9ca3af", fontSize: 11, marginTop: 2 },
  kcalBadge:    { backgroundColor: "#431407", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  kcalText:     { color: "#fb923c", fontSize: 11, fontWeight: "600" },
  cardExercises:{ color: "#4b5563", fontSize: 12 },

  emptyState:   { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { color: "#f9fafb", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptySub:     { color: "#6b7280", fontSize: 14, textAlign: "center", marginBottom: 20 },
  emptyBtn:     { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Modal shared
  modal:        { flex: 1, backgroundColor: BG },
  modalHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
                  borderBottomWidth: 1, borderBottomColor: BORDER },
  modalClose:   { color: "#6b7280", fontSize: 14, fontWeight: "600" },
  modalTitle:   { color: "#f9fafb", fontSize: 16, fontWeight: "700", flex: 1, textAlign: "center" },
  modalSave:    { color: BRAND, fontSize: 14, fontWeight: "700" },
  modalContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

  errorBox:     { backgroundColor: "#450a0a", borderWidth: 1, borderColor: "#7f1d1d",
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  errorText:    { color: "#fca5a5", fontSize: 13 },

  fieldLabel:   { color: "#d1d5db", fontSize: 13, fontWeight: "500", marginBottom: 6, marginTop: 14 },
  fieldInput:   { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 12,
                  paddingHorizontal: 14, paddingVertical: 13, color: "#f9fafb", fontSize: 15 },
  hintText:     { color: "#4b5563", fontSize: 12, marginTop: 16 },

  // Detail modal
  detailMeta:   { flexDirection: "row", gap: 16, marginBottom: 16 },
  detailMetaItem:{ alignItems: "center" },
  detailMetaVal:{ color: "#f9fafb", fontSize: 16, fontWeight: "700" },
  detailMetaLabel:{ color: "#6b7280", fontSize: 11, marginTop: 2 },
  typeBadge:    { alignSelf: "flex-start", backgroundColor: "#172554", borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  typeBadgeText:{ color: "#60a5fa", fontSize: 12, fontWeight: "600" },
  notesBox:     { backgroundColor: SURFACE, borderRadius: 12, padding: 12, marginBottom: 16 },
  notesText:    { color: "#9ca3af", fontSize: 13 },
  exercisesTitle:{ color: "#f9fafb", fontSize: 15, fontWeight: "700", marginBottom: 10 },
  exerciseRow:  { backgroundColor: SURFACE, borderRadius: 12, padding: 12, marginBottom: 8 },
  exerciseName: { color: "#f9fafb", fontSize: 14, fontWeight: "600" },
  exerciseMeta: { color: "#9ca3af", fontSize: 12, marginTop: 3 },
  exerciseNote: { color: "#6b7280", fontSize: 11, marginTop: 3, fontStyle: "italic" },
});
