import { useState, useEffect, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { workoutsApi, templatesApi, searchApi } from "../../api";
import type { Workout, WorkoutExercise, PRResult, WorkoutTemplate } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification
// ─────────────────────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (message: string) => {
    setMsg(message);
    setTimeout(() => setMsg(null), 3000);
  };
  return { msg, show };
}

function ToastBanner({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
      <span className="text-green-400">✓</span>
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────
interface ExRow {
  key: string; exerciseName: string; sets: string;
  reps: string; weight: string; rpe: string; notes: string;
}
interface WorkoutExerciseInput {
  exerciseName: string; sets: number; reps: number; order: number;
  weight?: number; rpe?: number; notes?: string;
}
interface WorkoutCreateInput {
  name: string; date: string; duration: number;
  caloriesBurned?: number; notes?: string; exercises: WorkoutExerciseInput[];
}

function newRow(): ExRow {
  return { key: Math.random().toString(36).slice(2), exerciseName: "", sets: "3", reps: "10", weight: "", rpe: "", notes: "" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise search combobox (supports optional muscle-group filter)
// ─────────────────────────────────────────────────────────────────────────────
function ExerciseSearch({
  value, onChange, muscle, placeholder = "Search exercise…",
}: {
  value: string; onChange: (v: string, item?: any) => void;
  muscle?: string; placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      searchApi.exercises(query, muscle ? { muscle } : {}, 10)
        .then((r) => { setResults(r.data.results); setOpen(true); });
    }, 200);
    return () => clearTimeout(t);
  }, [query, muscle]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
        onFocus={() => query && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map((ex) => (
            <li
              key={ex.id}
              onMouseDown={() => { setQuery(ex.name); onChange(ex.name, ex); setOpen(false); }}
              className="px-3 py-2 text-sm hover:bg-brand-50 cursor-pointer"
            >
              <span className="font-medium">{ex.name}</span>
              <span className="ml-2 text-xs text-gray-400">{ex.primaryMuscle} · {ex.equipment}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise rows (reused in create & edit forms)
// ─────────────────────────────────────────────────────────────────────────────
function ExerciseRows({ rows, setRows }: { rows: ExRow[]; setRows: Dispatch<SetStateAction<ExRow[]>> }) {
  const updateRow = (key: string, field: keyof ExRow, val: string) =>
    setRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: val } : r));
  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700">Exercises</p>
        <Button size="sm" variant="secondary" onClick={() => setRows((p) => [...p, newRow()])}>+ Add</Button>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-12 gap-1.5 items-start">
            <div className="col-span-4"><ExerciseSearch value={r.exerciseName} onChange={(v) => updateRow(r.key, "exerciseName", v)} /></div>
            <div className="col-span-2"><input value={r.sets} onChange={(e) => updateRow(r.key, "sets", e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center" placeholder="Sets" /></div>
            <div className="col-span-2"><input value={r.reps} onChange={(e) => updateRow(r.key, "reps", e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center" placeholder="Reps" /></div>
            <div className="col-span-2"><input value={r.weight} onChange={(e) => updateRow(r.key, "weight", e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center" placeholder="kg" /></div>
            <div className="col-span-1"><input value={r.rpe} onChange={(e) => updateRow(r.key, "rpe", e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center" placeholder="RPE" /></div>
            <div className="col-span-1 flex items-center justify-center pt-1.5">
              <button onClick={() => removeRow(r.key)} className="text-gray-300 hover:text-red-400 transition-colors">✕</button>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-1.5 mt-1">
        <p className="col-span-4 text-xs text-gray-400 pl-2">Exercise</p>
        <p className="col-span-2 text-xs text-gray-400 text-center">Sets</p>
        <p className="col-span-2 text-xs text-gray-400 text-center">Reps</p>
        <p className="col-span-2 text-xs text-gray-400 text-center">kg</p>
        <p className="col-span-1 text-xs text-gray-400 text-center">RPE</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create workout form
// ─────────────────────────────────────────────────────────────────────────────
function WorkoutForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState("60");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ExRow[]>([newRow()]);
  const [loading, setLoading] = useState(false);
  const [newPRs, setNewPRs] = useState<PRResult[]>([]);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Workout name is required"); return; }
    if (Number(duration) < 1) { setError("Duration must be at least 1 minute"); return; }
    setLoading(true); setError("");
    try {
      const payload: WorkoutCreateInput = {
        name: name.trim(), date,
        duration: Number(duration),
        ...(calories && { caloriesBurned: Number(calories) }),
        ...(notes && { notes }),
        exercises: rows.filter((r) => r.exerciseName.trim()).map((r, i) => ({
          exerciseName: r.exerciseName.trim(),
          sets: Number(r.sets) || 3, reps: Number(r.reps) || 10, order: i,
          ...(r.weight && { weight: Number(r.weight) }),
          ...(r.rpe && { rpe: Number(r.rpe) }),
          ...(r.notes && { notes: r.notes }),
        })),
      };
      const res = await workoutsApi.create(payload);
      if (res.data.newPRs?.length) setNewPRs(res.data.newPRs);
      else onSave();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to save workout");
    } finally { setLoading(false); }
  };

  if (newPRs.length) return (
    <div className="text-center space-y-4">
      <div className="text-5xl">🏆</div>
      <h3 className="text-lg font-bold text-gray-900">New Personal Records!</h3>
      <div className="space-y-2">
        {newPRs.map((pr) => (
          <div key={pr.exerciseName} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <div className="text-left">
              <p className="font-semibold text-gray-800">{pr.exerciseName}</p>
              <p className="text-xs text-gray-500">Previous best: {pr.previousBest > 0 ? `${pr.previousBest} kg` : "First time"}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-yellow-600">{pr.weight} kg</p>
              <p className="text-xs text-gray-500">× {pr.reps} reps</p>
            </div>
          </div>
        ))}
      </div>
      <Button className="w-full" onClick={onSave}>Done</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Workout Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Push Day" className="col-span-2" />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Duration (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <Input label="Calories Burned" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="optional" className="col-span-2" />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="How did it go?" className="col-span-2" />
      </div>
      <ExerciseRows rows={rows} setRows={setRows} />
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={loading} onClick={submit}>Save Workout</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit workout form (header fields only)
// ─────────────────────────────────────────────────────────────────────────────
function EditWorkoutForm({ workout, onSave, onClose }: { workout: Workout; onSave: () => void; onClose: () => void }) {
  const [name, setName] = useState(workout.name);
  const [date, setDate] = useState(workout.date.split("T")[0]);
  const [duration, setDuration] = useState(String(workout.duration));
  const [calories, setCalories] = useState(workout.caloriesBurned ? String(Math.round(workout.caloriesBurned)) : "");
  const [notes, setNotes] = useState(workout.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Workout name is required"); return; }
    setLoading(true); setError("");
    try {
      await workoutsApi.update(workout.id, {
        name: name.trim(), date, duration: Number(duration),
        caloriesBurned: calories ? Number(calories) : undefined,
        notes: notes || undefined,
      });
      onSave();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to update workout");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Workout Name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-2" />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Duration (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <Input label="Calories Burned" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="optional" className="col-span-2" />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="col-span-2" />
      </div>
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={loading} onClick={submit}>Save Changes</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add exercise panel — expanded muscle groups + full exercise list
// ─────────────────────────────────────────────────────────────────────────────
const MUSCLE_GROUPS = [
  "Any", "Back", "Chest", "Biceps", "Triceps", "Forearms",
  "Shoulders", "Legs", "Hamstrings", "Glutes", "Core",
];

interface ExerciseItem { name: string; muscleGroup?: string; equipment?: string }

function AddExercisePanel({
  workoutId, onAdded, onCancel,
}: {
  workoutId: number; onAdded: (ex: WorkoutExercise) => void; onCancel: () => void;
}) {
  const [muscle, setMuscle] = useState("Any");
  const [exerciseList, setExerciseList] = useState<ExerciseItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [filter, setFilter] = useState("");

  // Queued exercise to add
  const [selected, setSelected] = useState<string | null>(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [weight, setWeight] = useState("");
  const [rpe, setRpe] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load exercises when muscle group changes
  useEffect(() => {
    setListLoading(true);
    setFilter(""); setSelected(null);
    searchApi.exercises("", { muscle: muscle === "Any" ? undefined : muscle }, 80)
      .then((res) => setExerciseList(res.data.results ?? []))
      .catch(() => setExerciseList([]))
      .finally(() => setListLoading(false));
  }, [muscle]);

  const displayed = filter.trim()
    ? exerciseList.filter((e) => e.name.toLowerCase().includes(filter.toLowerCase()))
    : exerciseList;

  const submit = async () => {
    if (!selected) { setError("Select an exercise first"); return; }
    if (!sets || !reps) { setError("Sets and reps are required"); return; }
    setSaving(true); setError("");
    try {
      const res = await workoutsApi.addExercise(workoutId, {
        exerciseName: selected,
        sets: Number(sets),
        reps: Number(reps),
        ...(weight && { weight: Number(weight) }),
        ...(rpe    && { rpe:    Number(rpe) }),
      });
      onAdded(res.data.exercise);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to add exercise");
    } finally { setSaving(false); }
  };

  return (
    <div className="mt-4 border border-brand-200 bg-brand-50 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-brand-800">Add Exercise</p>

      {/* Muscle group chips */}
      <div className="flex flex-wrap gap-1.5">
        {MUSCLE_GROUPS.map((mg) => (
          <button
            key={mg}
            onClick={() => setMuscle(mg)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              muscle === mg
                ? "bg-brand-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-brand-400"
            }`}
          >
            {mg}
          </button>
        ))}
      </div>

      {/* Exercise list with filter */}
      <div>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Filter ${muscle !== "Any" ? muscle : ""} exercises…`}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white mb-2"
        />
        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-50">
          {listLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No exercises found</p>
          ) : displayed.map((ex) => (
            <button
              key={ex.name}
              onClick={() => setSelected(ex.name === selected ? null : ex.name)}
              className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                selected === ex.name
                  ? "bg-brand-50 text-brand-800"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <span className="text-sm font-medium">{ex.name}</span>
              <span className="text-xs text-gray-400">{ex.equipment || ex.muscleGroup || ""}</span>
            </button>
          ))}
        </div>
        {selected && (
          <p className="text-xs text-brand-700 mt-1.5 font-medium">Selected: {selected}</p>
        )}
      </div>

      {/* Sets / Reps / Weight / RPE */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Sets", value: sets, onChange: setSets },
          { label: "Reps", value: reps, onChange: setReps },
          { label: "kg",   value: weight, onChange: setWeight, placeholder: "opt." },
          { label: "RPE",  value: rpe,    onChange: setRpe,    placeholder: "opt." },
        ].map(({ label, value, onChange, placeholder }) => (
          <div key={label}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder ?? ""}
              type="number"
              className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="flex-1" loading={saving} onClick={submit}>Add to Workout</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workout detail modal — view, edit exercises inline, add exercises
// ─────────────────────────────────────────────────────────────────────────────
function WorkoutDetail({
  workout, onClose, onEdit, onDelete, onRefresh,
}: {
  workout: Workout; onClose: () => void; onEdit: () => void;
  onDelete: () => void; onRefresh: () => void;
}) {
  type ExerciseEditData = Pick<WorkoutExercise, "sets" | "reps"> & { weight: number | null; rpe: number | null };

  const [exercises, setExercises] = useState<WorkoutExercise[]>(workout.exercises);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<ExerciseEditData | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  const updateEditData = (patch: Partial<ExerciseEditData>) =>
    setEditData((current) => current ? { ...current, ...patch } : current);

  const saveEdit = async (id: number) => {
    if (!editData) return;
    setSaving(true);
    try {
      await workoutsApi.updateExercise(id, editData);
      setExercises((prev) => prev.map((e) => e.id === id ? { ...e, ...editData } : e));
      setEditing(null); setEditData(null);
      onRefresh();
    } finally { setSaving(false); }
  };

  const deleteExercise = async (id: number) => {
    if (!confirm("Remove this exercise from the workout?")) return;
    await workoutsApi.deleteExercise(id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
    onRefresh();
  };

  const handleDeleteWorkout = async () => {
    if (!confirm(`Delete "${workout.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try { await workoutsApi.delete(workout.id); onDelete(); }
    finally { setDeleting(false); }
  };

  const handleExerciseAdded = (ex: WorkoutExercise) => {
    setExercises((prev) => [...prev, ex]);
    setShowAddPanel(false);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Meta row */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          <span>{format(parseISO(workout.date), "EEEE, MMMM d, yyyy")}</span>
          <span className="mx-2">·</span>
          <span>{workout.duration} min</span>
          {workout.caloriesBurned && <span className="mx-2">· {Math.round(workout.caloriesBurned)} kcal</span>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit}>✏️ Edit</Button>
          <Button size="sm" variant="danger" loading={deleting} onClick={handleDeleteWorkout}>🗑 Delete</Button>
        </div>
      </div>

      {workout.notes && <p className="text-sm text-gray-600 italic bg-gray-50 rounded-xl px-3 py-2">{workout.notes}</p>}

      {/* Exercise list */}
      <div className="space-y-2">
        {exercises.map((ex) => (
          <div key={ex.id} className="border border-gray-100 rounded-xl p-3">
            {editing === ex.id ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">{ex.exerciseName}</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Sets",     defaultValue: ex.sets,        field: "sets"   as const },
                    { label: "Reps",     defaultValue: ex.reps,        field: "reps"   as const },
                    { label: "Weight kg",defaultValue: ex.weight ?? "",field: "weight" as const },
                    { label: "RPE",      defaultValue: ex.rpe ?? "",   field: "rpe"    as const },
                  ].map(({ label, defaultValue, field }) => (
                    <div key={field}>
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <input
                        defaultValue={String(defaultValue)}
                        onChange={(e) => updateEditData({
                          [field]: e.target.value === ""
                            ? null
                            : Number(e.target.value),
                        } as Partial<ExerciseEditData>)}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm text-center"
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" loading={saving} onClick={() => saveEdit(ex.id)} className="flex-1">Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(null); setEditData(null); }} className="flex-1">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{ex.exerciseName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ex.sets} sets × {ex.reps} reps{ex.weight ? ` @ ${ex.weight} kg` : ""}
                    {ex.rpe ? ` · RPE ${ex.rpe}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditing(ex.id); setEditData({ sets: ex.sets, reps: ex.reps, weight: ex.weight ?? null, rpe: ex.rpe ?? null }); }}
                    className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteExercise(ex.id)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {exercises.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No exercises logged</p>}
      </div>

      {/* Add exercise */}
      {showAddPanel ? (
        <AddExercisePanel
          workoutId={workout.id}
          onAdded={handleExerciseAdded}
          onCancel={() => setShowAddPanel(false)}
        />
      ) : (
        <button
          onClick={() => setShowAddPanel(true)}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-sm text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors"
        >
          + Add Exercise
        </button>
      )}

      <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates tab — Recommended & My Templates (merged from TemplatesPage)
// ─────────────────────────────────────────────────────────────────────────────
const OBJECTIVE_COLORS: Record<string, string> = {
  hypertrophy: "bg-blue-100 text-blue-700",
  strength:    "bg-purple-100 text-purple-700",
  fat_loss:    "bg-orange-100 text-orange-700",
  endurance:   "bg-green-100 text-green-700",
  general:     "bg-gray-100 text-gray-600",
};

const SPLIT_ICONS: Record<string, string> = {
  PPL: "🔄", Upper_Lower: "↕️", Bro_Split: "💪", Full_Body: "🏋️", Custom: "⚙️",
};

const SPLIT_LABELS: Record<string, string> = {
  Full_Body_3d:   "Full Body (3×/week)",
  PPL_6d:         "Push Pull Legs (6×/week)",
  Upper_Lower_4d: "Upper / Lower (4×/week)",
  Bro_Split_5d:   "Bro Split (5×/week)",
  Custom_4d:      "Fat Loss (4×/week)",
};

// ─────────────────────────────────────────────────────────────────────────────
// Smart plan suggestions — injury warnings, missing muscles, gender/goal advice
// ─────────────────────────────────────────────────────────────────────────────

interface Suggestion { type: "warning" | "tip" | "info"; text: string }

// Known high-spinal-load exercises (flag if overrepresented with no core work)
const SPINAL_LOAD_EXERCISES = new Set([
  "Barbell Squat", "Romanian Deadlift", "Deadlift", "Good Morning", "Barbell Row",
  "T-Bar Row", "Barbell Shoulder Press", "Overhead Press",
]);

// Core exercises
const CORE_EXERCISES = new Set([
  "Plank", "Ab Wheel Rollout", "Cable Crunch", "Hanging Leg Raise", "Side Plank",
  "Dead Bug", "Leg Raise", "Russian Twist", "Crunch", "Sit-Up", "Bird Dog",
]);

// Primary muscle group map — categorise each exercise name by muscle
const MUSCLE_MAP: Record<string, string> = {
  // Chest
  "Bench Press": "Chest", "Incline Bench Press": "Chest", "Decline Bench Press": "Chest",
  "Dumbbell Chest Press": "Chest", "Push-Up": "Chest", "Dips": "Chest",
  // Back
  "Barbell Row": "Back", "Dumbbell Row": "Back", "Pull-Up": "Back", "Chin-Up": "Back",
  "Lat Pulldown": "Back", "Seated Cable Row": "Back", "T-Bar Row": "Back",
  "Deadlift": "Back", "Romanian Deadlift": "Back",
  // Shoulders
  "Overhead Press": "Shoulders", "Dumbbell Shoulder Press": "Shoulders",
  "Lateral Raise": "Shoulders", "Front Raise": "Shoulders", "Face Pull": "Shoulders",
  // Biceps
  "Barbell Curl": "Biceps", "Dumbbell Curl": "Biceps", "Hammer Curl": "Biceps",
  "Cable Curl": "Biceps", "Preacher Curl": "Biceps", "Concentration Curl": "Biceps",
  // Triceps
  "Skull Crusher": "Triceps", "Tricep Pushdown": "Triceps", "Close-Grip Bench": "Triceps",
  "Overhead Tricep Extension": "Triceps", "Tricep Dips": "Triceps",
  // Legs/Quads
  "Barbell Squat": "Quads", "Goblet Squat": "Quads", "Leg Press": "Quads",
  "Leg Extension": "Quads", "Bulgarian Split Squat": "Quads", "Walking Lunge": "Quads",
  "Front Squat": "Quads",
  // Hamstrings
  "Leg Curl": "Hamstrings",
  // Glutes
  "Hip Thrust": "Glutes", "Glute Bridge": "Glutes", "Sumo Deadlift": "Glutes",
};

function analyzeTemplate(
  exercises: WorkoutTemplate["exercises"],
  user?: { sex?: string | null; goal?: string | null; fitnessLevel?: string | null }
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const names = exercises.map((e) => e.exerciseName);
  const muscleCoverage = new Set<string>();

  names.forEach((n) => {
    const muscle = MUSCLE_MAP[n];
    if (muscle) muscleCoverage.add(muscle);
  });

  // ── Spinal load warning ────────────────────────────────────────────────────
  const spinalLoadCount = names.filter((n) => SPINAL_LOAD_EXERCISES.has(n)).length;
  const hasCoreWork     = names.some((n) => CORE_EXERCISES.has(n));
  if (spinalLoadCount >= 2 && !hasCoreWork) {
    suggestions.push({
      type: "warning",
      text: "⚠️ Lower back load: this plan includes multiple spinal-loading movements without dedicated core work. Adding a Plank or Ab Wheel Rollout will improve lumbar stability and injury resilience.",
    });
  }

  // ── No posterior chain ─────────────────────────────────────────────────────
  const hasQuads  = muscleCoverage.has("Quads");
  const hasHamstrings = names.some((n) => ["Leg Curl", "Romanian Deadlift", "Hip Thrust", "Glute Bridge"].includes(n)) || muscleCoverage.has("Hamstrings");
  if (hasQuads && !hasHamstrings) {
    suggestions.push({
      type: "warning",
      text: "⚠️ Quad dominance: there is quad work but no hamstring/glute exercises. Add Leg Curls or Hip Thrusts to prevent knee imbalances.",
    });
  }

  // ── Missing muscle groups for full-body sessions ───────────────────────────
  const isFullBody = exercises.length >= 6 && !["PPL", "Bro_Split", "Upper_Lower"].some(() => false);
  if (isFullBody) {
    const important = ["Chest", "Back", "Quads", "Shoulders"] as const;
    const missing = important.filter((m) => !muscleCoverage.has(m));
    if (missing.length > 0) {
      suggestions.push({
        type: "tip",
        text: `💡 Missing muscle groups detected: ${missing.join(", ")}. Consider adding one exercise per group for a more complete session.`,
      });
    }
  }

  // ── Gender-aware suggestions ────────────────────────────────────────────────
  if (user?.sex === "female") {
    const hasGlutes = names.some((n) => ["Hip Thrust", "Glute Bridge", "Sumo Deadlift", "Bulgarian Split Squat"].includes(n));
    if (!hasGlutes) {
      suggestions.push({
        type: "tip",
        text: "💡 Female-specific tip: Hip Thrusts and Bulgarian Split Squats are highly effective for glute development. Consider adding one to this plan.",
      });
    }
  }

  if (user?.sex === "male") {
    const hasBack = muscleCoverage.has("Back");
    const hasChest = muscleCoverage.has("Chest");
    const chestToBackRatio = (names.filter((n) => MUSCLE_MAP[n] === "Chest").length) /
      Math.max(1, names.filter((n) => MUSCLE_MAP[n] === "Back").length);
    if (hasChest && hasBack && chestToBackRatio > 1.5) {
      suggestions.push({
        type: "tip",
        text: "💡 Push/pull balance: there's more chest work than back work. Add a row or pull-up variation to protect shoulder posture.",
      });
    }
  }

  // ── Goal-aware suggestions ─────────────────────────────────────────────────
  if (user?.goal === "lose_fat" || user?.goal?.toLowerCase().includes("lose")) {
    const hasCompound = names.some((n) =>
      ["Barbell Squat", "Deadlift", "Bench Press", "Overhead Press", "Barbell Row"].includes(n)
    );
    if (!hasCompound) {
      suggestions.push({
        type: "info",
        text: "ℹ️ Fat-loss tip: compound movements (squats, deadlifts, rows) burn significantly more calories and preserve muscle better than isolation exercises alone.",
      });
    }
  }

  if ((user?.goal === "build_muscle" || user?.goal === "body_recomp") && user?.fitnessLevel === "beginner") {
    suggestions.push({
      type: "info",
      text: "ℹ️ As a beginner, focus on progressive overload — small weight increases each week. Full-body or upper-lower splits produce faster results at this stage than bro splits.",
    });
  }

  return suggestions;
}

function SmartPlanSuggestions({ template, user }: {
  template: WorkoutTemplate;
  user?: { sex?: string | null; goal?: string | null; fitnessLevel?: string | null };
}) {
  const suggestions = analyzeTemplate(template.exercises, user);
  if (suggestions.length === 0) return null;

  const colorMap = {
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    tip:     "border-blue-200  bg-blue-50  text-blue-800",
    info:    "border-gray-200  bg-gray-50  text-gray-700",
  };

  return (
    <div className="space-y-2 mt-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Smart Suggestions</p>
      {suggestions.map((s, i) => (
        <div key={i} className={`border rounded-xl px-3 py-2.5 text-xs leading-relaxed ${colorMap[s.type]}`}>
          {s.text}
        </div>
      ))}
    </div>
  );
}

function TemplateCard({ template, onStart, onView, onDelete }: {
  template: WorkoutTemplate;
  onStart: () => void; onView: () => void; onDelete?: () => void;
}) {
  const muscleGroups = Array.isArray(template.muscleGroups) ? template.muscleGroups : [];

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{SPLIT_ICONS[template.splitType] ?? "🏋️"}</span>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{template.name}</h3>
          </div>
          <p className="text-xs text-gray-500">{template.dayLabel} · {template.frequency}×/week</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {template.isSystem && <Badge variant="info">Recommended</Badge>}
          {template.aiGenerated && !template.isSystem && <Badge variant="success">AI</Badge>}
        </div>
      </div>

      {template.description && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">{template.description}</p>
      )}

      <div className="flex gap-1.5 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OBJECTIVE_COLORS[template.objective] ?? "bg-gray-100 text-gray-600"}`}>
          {template.objective.replace("_", " ")}
        </span>
        {muscleGroups.slice(0, 3).map((m) => (
          <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m}</span>
        ))}
      </div>

      {template.exercises.length > 0 && (
        <div className="text-xs text-gray-400 mb-3 space-y-0.5">
          {template.exercises.slice(0, 4).map((e) => (
            <p key={e.id}>· {e.exerciseName} <span className="text-gray-300">({e.sets}×{e.reps})</span></p>
          ))}
          {template.exercises.length > 4 && <p className="text-gray-300">+{template.exercises.length - 4} more</p>}
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-3 border-t border-gray-100">
        {onDelete && (
          <button onClick={onDelete} className="px-2 text-xs text-red-400 hover:text-red-600 transition-colors">🗑</button>
        )}
        <Button variant="secondary" size="sm" className="flex-1" onClick={onView}>View</Button>
        <Button size="sm" className="flex-1" onClick={onStart}>▶ Start</Button>
      </div>
    </Card>
  );
}

function TemplateDetail({ template, onStart, onClose, onFork, onRename }: {
  template: WorkoutTemplate; onStart: () => void; onClose: () => void;
  onFork?: () => void; onRename?: (name: string) => void;
}) {
  const { user } = useAuthStore();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(template.name);
  const [forking, setForking] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{SPLIT_ICONS[template.splitType] ?? "🏋️"}</span>
        <div className="flex-1 min-w-0">
          {renaming && !template.isSystem ? (
            <div className="flex gap-2 items-center">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) { onRename?.(newName.trim()); setRenaming(false); }
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="flex-1 rounded-lg border border-brand-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Button size="sm" onClick={() => { if (newName.trim()) { onRename?.(newName.trim()); setRenaming(false); } }}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => setRenaming(false)}>✕</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 truncate">{template.name}</h3>
              {!template.isSystem && onRename && (
                <button onClick={() => setRenaming(true)} className="text-xs text-gray-400 hover:text-brand-600 transition-colors shrink-0">✏️</button>
              )}
            </div>
          )}
          <p className="text-sm text-gray-500">{template.dayLabel} · {template.frequency}×/week · {template.objective}</p>
        </div>
      </div>

      {template.description && <p className="text-sm text-gray-600">{template.description}</p>}

      {/* System template fork notice */}
      {template.isSystem && onFork && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <span>🔧</span>
          <div className="flex-1">
            <p className="font-medium">Want to customise this plan?</p>
            <p className="text-xs text-blue-600 mt-0.5">Fork it to My Templates — then you can rename it and adjust exercises.</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={forking}
            onClick={async () => { setForking(true); try { await onFork(); } finally { setForking(false); } }}
          >
            Fork
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {template.exercises.map((ex, i) => (
          <div key={ex.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{ex.exerciseName}</p>
              <p className="text-xs text-gray-400">{ex.sets} sets × {ex.reps} reps{ex.restSeconds ? ` · ${ex.restSeconds}s rest` : ""}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Smart suggestions panel */}
      <SmartPlanSuggestions template={template} user={user ?? undefined} />

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
        <Button className="flex-1" onClick={onStart}>▶ Start Workout</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile-aware recommended routine banner
// ─────────────────────────────────────────────────────────────────────────────
const GOAL_OBJECTIVE_MAP: Record<string, string> = {
  "lose weight": "fat_loss",
  "lose_fat": "fat_loss",
  "build muscle": "hypertrophy",
  "build_muscle": "hypertrophy",
  "body_recomp": "hypertrophy",
  "gain muscle, maintain fat %": "hypertrophy",
  "get stronger": "strength",
  "improve endurance": "endurance",
  "performance": "endurance",
  "maintain": "general",
};

function RecommendedBanner({ goal }: { goal?: string | null }) {
  if (!goal) return null;
  const objective = GOAL_OBJECTIVE_MAP[goal.toLowerCase()];
  if (!objective) return null;

  const labels: Record<string, string> = {
    fat_loss: "Your goal is weight loss — templates below are sorted by fat-loss focus.",
    hypertrophy: "Your goal is muscle building — hypertrophy templates are highlighted first.",
    strength: "Your goal is strength — strength-focused programs are at the top.",
    endurance: "Your goal is endurance — cardio and full-body templates are prioritized.",
  };

  return (
    <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-sm text-brand-800">
      <span className="text-lg">🎯</span>
      <p>{labels[objective]}</p>
    </div>
  );
}

function TemplatesTab() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [subTab, setSubTab] = useState<"recommended" | "mine">("recommended");
  const [grouped, setGrouped] = useState<Record<string, WorkoutTemplate[]>>({});
  const [mine, setMine] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [detail, setDetail] = useState<WorkoutTemplate | null>(null);
  const [seeding, setSeeding] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, mineRes] = await Promise.all([
        templatesApi.getRecommended(),
        templatesApi.getAll(),
      ]);
      // Sort recommended groups so user's objective comes first
      const userObjective = user?.goal ? GOAL_OBJECTIVE_MAP[user.goal.toLowerCase()] : null;
      const raw = recRes.data.grouped;
      if (userObjective) {
        // Templates matching objective get boosted within each group
        for (const key of Object.keys(raw)) {
          raw[key] = [
            ...raw[key].filter((t) => t.objective === userObjective),
            ...raw[key].filter((t) => t.objective !== userObjective),
          ];
        }
      }
      setGrouped(raw);
      setMine(mineRes.data.templates.filter((t) => !t.isSystem));
    } finally { setLoading(false); }
  }, [user?.goal]);

  useEffect(() => { load(); }, [load]);

  const startFromTemplate = async (template: WorkoutTemplate) => {
    setStarting(template.id);
    try {
      await workoutsApi.startFromTemplate(template.id);
      toast.show("Workout started! Check your history.");
      navigate("/workouts");
    } catch { alert("Failed to start workout"); }
    finally { setStarting(null); }
  };

  const seedTemplates = async () => {
    setSeeding(true);
    try { await templatesApi.seed(); await load(); }
    finally { setSeeding(false); }
  };

  const deleteMyTemplate = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    await templatesApi.delete(id);
    setMine((prev) => prev.filter((t) => t.id !== id));
    toast.show("Template deleted.");
  };

  const forkTemplate = async (template: WorkoutTemplate) => {
    const res = await templatesApi.create({
      name: `${template.name} (My Copy)`,
      description: template.description,
      splitType: template.splitType,
      objective: template.objective,
      frequency: template.frequency,
      dayLabel: template.dayLabel,
      muscleGroups: Array.isArray(template.muscleGroups) ? template.muscleGroups : [],
      isSystem: false,
      exercises: template.exercises.map((e) => ({
        exerciseName: e.exerciseName,
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
        notes: e.notes,
        order: e.order,
      })),
    });
    const forked = res.data.template;
    setMine((prev) => [...prev, forked]);
    setDetail(forked);
    setSubTab("mine");
    toast.show(`"${forked.name}" added to My Templates. You can rename it now.`);
  };

  const renameTemplate = async (id: number, name: string) => {
    await templatesApi.update(id, { name });
    setMine((prev) => prev.map((t) => t.id === id ? { ...t, name } : t));
    setDetail((d) => d?.id === id ? { ...d, name } : d);
    toast.show("Template renamed.");
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["recommended", "mine"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${subTab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t === "recommended" ? "📋 Recommended" : `⚙️ My Templates${mine.length ? ` (${mine.length})` : ""}`}
          </button>
        ))}
      </div>

      {subTab === "recommended" ? (
        Object.keys(grouped).length === 0 ? (
          <Card className="text-center py-14">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="font-semibold text-gray-800 mb-2">No recommended templates yet</h3>
            <p className="text-sm text-gray-400 mb-4">Seed the database with 24 research-based workout splits</p>
            <Button loading={seeding} onClick={seedTemplates}>Seed Recommended Templates</Button>
          </Card>
        ) : (
          <div className="space-y-8">
            <RecommendedBanner goal={user?.goal} />
            {Object.entries(grouped).map(([groupKey, templates]) => (
              <div key={groupKey}>
                <h2 className="text-base font-bold text-gray-800 mb-4">{SPLIT_LABELS[groupKey] ?? groupKey}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      onStart={() => startFromTemplate(t)}
                      onView={() => setDetail(t)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        mine.length === 0 ? (
          <Card className="text-center py-14">
            <div className="text-5xl mb-4">⚙️</div>
            <h3 className="font-semibold text-gray-800 mb-2">No personal templates yet</h3>
            <p className="text-sm text-gray-400 mb-4">Save a logged workout as a template, or ask the AI Coach to generate one.</p>
            <Button variant="secondary" onClick={() => navigate("/chat?agent=coach")}>🤖 Ask AI Coach</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mine.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onStart={() => startFromTemplate(t)}
                onView={() => setDetail(t)}
                onDelete={() => deleteMyTemplate(t.id)}
              />
            ))}
          </div>
        )
      )}

      {/* Template detail modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name} size="md">
        {detail && (
          <TemplateDetail
            template={detail}
            onStart={() => { setDetail(null); startFromTemplate(detail); }}
            onClose={() => setDetail(null)}
            onFork={detail.isSystem ? () => forkTemplate(detail) : undefined}
            onRename={!detail.isSystem ? (name) => renameTemplate(detail.id, name) : undefined}
          />
        )}
      </Modal>

      <ToastBanner msg={toast.msg} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkoutsPage() {
  const [tab, setTab] = useState<"history" | "templates">("history");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Workout | null>(null);
  const [editing, setEditing] = useState<Workout | null>(null);
  const toast = useToast();

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await workoutsApi.getAll(p);
      setWorkouts(res.data.workouts);
      setTotal(res.data.total);
      setPage(res.data.page);
      setPages(res.data.pages);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workouts</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tab === "history"
              ? `${total} workout${total !== 1 ? "s" : ""} logged`
              : "Pre-built and custom workout splits"}
          </p>
        </div>
        {tab === "history" && (
          <Button onClick={() => setShowForm(true)}>+ Log Workout</Button>
        )}
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: "history",   label: "🏋️ History" },
          { key: "templates", label: "📋 Templates" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* History tab */}
      {tab === "history" && (
        loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : workouts.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-5xl mb-4">🏋️</div>
            <h3 className="font-semibold text-gray-800 mb-2">No workouts yet</h3>
            <p className="text-sm text-gray-400 mb-4">Log your first workout to start tracking progress</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowForm(true)}>Log Your First Workout</Button>
              <Button variant="secondary" onClick={() => setTab("templates")}>Browse Templates</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {workouts.map((w) => (
                <Card key={w.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(w)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-lg font-bold shrink-0">
                        {w.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{w.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {format(parseISO(w.date), "MMM d, yyyy")} · {w.duration} min · {w.exercises.length} exercises
                        </p>
                        {w.exercises.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {w.exercises.slice(0, 3).map((e) => e.exerciseName).join(" · ")}
                            {w.exercises.length > 3 ? ` +${w.exercises.length - 3} more` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {w.caloriesBurned && <Badge variant="warning">{Math.round(w.caloriesBurned)} kcal</Badge>}
                      <p className="text-xs text-gray-400">
                        {w.exercises.reduce((s, e) => s + e.sets * e.reps * (e.weight ?? 0), 0).toLocaleString()} kg vol
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex justify-center gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</Button>
                <span className="text-sm text-gray-500 py-1.5">Page {page} of {pages}</span>
                <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next →</Button>
              </div>
            )}
          </>
        )
      )}

      {/* Templates tab */}
      {tab === "templates" && <TemplatesTab />}

      {/* Create modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Workout" size="lg">
        <WorkoutForm
          onSave={() => { setShowForm(false); load(1); toast.show("Workout logged!"); }}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      {/* Detail modal */}
      <Modal open={!!selected && !editing} onClose={() => setSelected(null)} title={selected?.name} size="lg">
        {selected && (
          <WorkoutDetail
            workout={selected}
            onClose={() => setSelected(null)}
            onEdit={() => { setEditing(selected); setSelected(null); }}
            onDelete={() => { setSelected(null); load(page > 1 && workouts.length === 1 ? page - 1 : page); toast.show("Workout deleted."); }}
            onRefresh={() => load(page)}
          />
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Workout" size="md">
        {editing && (
          <EditWorkoutForm
            workout={editing}
            onSave={() => { setEditing(null); load(page); toast.show("Workout updated!"); }}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>

      <ToastBanner msg={toast.msg} />
    </div>
  );
}
