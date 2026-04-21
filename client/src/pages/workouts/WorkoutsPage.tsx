import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { workoutsApi, searchApi } from "../../api";
import type { Workout, WorkoutExercise, PRResult } from "../../types";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";

// ── Exercise row ──────────────────────────────────────────────────────────────
interface ExRow {
  key: string; exerciseName: string; sets: string;
  reps: string; weight: string; rpe: string; notes: string;
}
function newRow(): ExRow {
  return { key: Math.random().toString(36).slice(2), exerciseName: "", sets: "3", reps: "10", weight: "", rpe: "", notes: "" };
}

// ── Exercise search combobox ──────────────────────────────────────────────────
function ExerciseSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      searchApi.exercises(query, {}, 8).then((r) => { setResults(r.data.results); setOpen(true); });
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <input value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
        onFocus={() => query && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search exercise…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map((ex) => (
            <li key={ex.id} onMouseDown={() => { setQuery(ex.name); onChange(ex.name); setOpen(false); }}
              className="px-3 py-2 text-sm hover:bg-brand-50 cursor-pointer">
              <span className="font-medium">{ex.name}</span>
              <span className="ml-2 text-xs text-gray-400">{ex.primaryMuscle} · {ex.equipment}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Exercise rows shared between create & edit forms ──────────────────────────
function ExerciseRows({ rows, setRows }: { rows: ExRow[]; setRows: React.Dispatch<React.SetStateAction<ExRow[]>> }) {
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

// ── Create workout form ───────────────────────────────────────────────────────
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
      const res = await workoutsApi.create({
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
      });
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

// ── Edit workout form (header fields only — exercises edited inline in detail) ─
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
        name: name.trim(),
        date,
        duration: Number(duration),
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

// ── Workout detail / inline exercise edit ─────────────────────────────────────
function WorkoutDetail({
  workout, onClose, onEdit, onDelete, onRefresh,
}: {
  workout: Workout; onClose: () => void; onEdit: () => void;
  onDelete: () => void; onRefresh: () => void;
}) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>(workout.exercises);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<WorkoutExercise>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveEdit = async (id: number) => {
    setSaving(true);
    try {
      await workoutsApi.updateExercise(id, editData);
      setExercises((prev) => prev.map((e) => e.id === id ? { ...e, ...editData } : e));
      setEditing(null);
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
    try {
      await workoutsApi.delete(workout.id);
      onDelete();
    } finally { setDeleting(false); }
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
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Sets</p>
                    <input defaultValue={ex.sets} onChange={(e) => setEditData((d) => ({ ...d, sets: Number(e.target.value) }))}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Reps</p>
                    <input defaultValue={ex.reps} onChange={(e) => setEditData((d) => ({ ...d, reps: Number(e.target.value) }))}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Weight (kg)</p>
                    <input defaultValue={ex.weight ?? ""} onChange={(e) => setEditData((d) => ({ ...d, weight: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" placeholder="—" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">RPE</p>
                    <input defaultValue={ex.rpe ?? ""} onChange={(e) => setEditData((d) => ({ ...d, rpe: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm text-center" placeholder="—" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" loading={saving} onClick={() => saveEdit(ex.id)} className="flex-1">Save</Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(null)} className="flex-1">Cancel</Button>
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
                  <button onClick={() => { setEditing(ex.id); setEditData({ sets: ex.sets, reps: ex.reps, weight: ex.weight, rpe: ex.rpe }); }}
                    className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => deleteExercise(ex.id)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {exercises.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No exercises logged</p>}
      </div>

      <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Workout | null>(null);
  const [editing, setEditing] = useState<Workout | null>(null);

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
          <p className="text-gray-500 text-sm mt-1">{total} workout{total !== 1 ? "s" : ""} logged</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Log Workout</Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : workouts.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">🏋️</div>
          <h3 className="font-semibold text-gray-800 mb-2">No workouts yet</h3>
          <p className="text-sm text-gray-400 mb-4">Log your first workout to start tracking progress</p>
          <Button onClick={() => setShowForm(true)}>Log Your First Workout</Button>
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
      )}

      {/* Create modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Workout" size="lg">
        <WorkoutForm onSave={() => { setShowForm(false); load(1); }} onClose={() => setShowForm(false)} />
      </Modal>

      {/* Detail modal */}
      <Modal open={!!selected && !editing} onClose={() => setSelected(null)} title={selected?.name} size="lg">
        {selected && (
          <WorkoutDetail
            workout={selected}
            onClose={() => setSelected(null)}
            onEdit={() => { setEditing(selected); setSelected(null); }}
            onDelete={() => { setSelected(null); load(page > 1 && workouts.length === 1 ? page - 1 : page); }}
            onRefresh={() => load(page)}
          />
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Workout" size="md">
        {editing && (
          <EditWorkoutForm
            workout={editing}
            onSave={() => { setEditing(null); load(page); }}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  );
}
