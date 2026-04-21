import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { workoutsApi, searchApi } from "../../api";
import type { Workout, WorkoutExercise, PRResult } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { Badge } from "../../components/ui/Badge";

// ── Exercise row in the log form ──────────────────────────────────────────────
interface ExRow {
  key:          string;
  exerciseName: string;
  sets:         string;
  reps:         string;
  weight:       string;
  rpe:          string;
  notes:        string;
}

function newRow(): ExRow {
  return { key: Math.random().toString(36).slice(2), exerciseName: "", sets: "3", reps: "10", weight: "", rpe: "", notes: "" };
}

// ── Exercise search combobox ──────────────────────────────────────────────────
function ExerciseSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query,   setQuery]   = useState(value);
  const [results, setResults] = useState<any[]>([]);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => {
      searchApi.exercises(query, {}, 8).then((r) => { setResults(r.data.results); setOpen(true); });
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
        onFocus={() => query && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search exercise…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map((ex) => (
            <li
              key={ex.id}
              onMouseDown={() => { setQuery(ex.name); onChange(ex.name); setOpen(false); }}
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

// ── Workout log form ──────────────────────────────────────────────────────────
function WorkoutForm({ onSave, onClose }: { onSave: () => void; onClose: () => void }) {
  const [name,     setName]     = useState("");
  const [date,     setDate]     = useState(new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState("60");
  const [calories, setCalories] = useState("");
  const [notes,    setNotes]    = useState("");
  const [rows,     setRows]     = useState<ExRow[]>([newRow()]);
  const [loading,  setLoading]  = useState(false);
  const [newPRs,   setNewPRs]   = useState<PRResult[]>([]);
  const [error,    setError]    = useState("");

  const updateRow = (key: string, field: keyof ExRow, val: string) =>
    setRows((prev) => prev.map((r) => r.key === key ? { ...r, [field]: val } : r));

  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const submit = async () => {
    if (!name.trim()) { setError("Workout name is required"); return; }
    if (!duration || Number(duration) < 1) { setError("Duration must be at least 1 minute"); return; }
    const validExercises = rows.filter((r) => r.exerciseName.trim());
    setLoading(true); setError("");
    try {
      const res = await workoutsApi.create({
        name: name.trim(),
        date,
        duration: Number(duration),
        ...(calories && { caloriesBurned: Number(calories) }),
        ...(notes && { notes }),
        exercises: validExercises.map((r, i) => ({
          exerciseName: r.exerciseName.trim(),
          sets:  Number(r.sets)  || 3,
          reps:  Number(r.reps)  || 10,
          order: i,
          ...(r.weight && { weight: Number(r.weight) }),
          ...(r.rpe    && { rpe:    Number(r.rpe) }),
          ...(r.notes  && { notes:  r.notes }),
        })),
      });
      if (res.data.newPRs?.length) { setNewPRs(res.data.newPRs); }
      else { onSave(); }
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to save workout");
    } finally { setLoading(false); }
  };

  if (newPRs.length) {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">🏆</div>
        <h3 className="text-lg font-bold text-gray-900">New Personal Records!</h3>
        <div className="space-y-2">
          {newPRs.map((pr) => (
            <div key={pr.exerciseName} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <div className="text-left">
                <p className="font-semibold text-gray-800">{pr.exerciseName}</p>
                <p className="text-xs text-gray-500">Previous best: {pr.previousBest > 0 ? `${pr.previousBest} kg` : "First time logged"}</p>
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
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Workout Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Push Day" className="col-span-2" />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Duration (min)" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min="1" max="600" />
        <Input label="Calories Burned" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="optional" />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="How did it go?" className="col-span-2" />
      </div>

      {/* Exercises */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Exercises</p>
          <Button size="sm" variant="secondary" onClick={() => setRows((p) => [...p, newRow()])}>+ Add</Button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-12 gap-1.5 items-start">
              <div className="col-span-4">
                <ExerciseSearch value={r.exerciseName} onChange={(v) => updateRow(r.key, "exerciseName", v)} />
              </div>
              <div className="col-span-2">
                <input value={r.sets} onChange={(e) => updateRow(r.key, "sets", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center" placeholder="Sets" />
              </div>
              <div className="col-span-2">
                <input value={r.reps} onChange={(e) => updateRow(r.key, "reps", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center" placeholder="Reps" />
              </div>
              <div className="col-span-2">
                <input value={r.weight} onChange={(e) => updateRow(r.key, "weight", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center" placeholder="kg" />
              </div>
              <div className="col-span-1">
                <input value={r.rpe} onChange={(e) => updateRow(r.key, "rpe", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm text-center" placeholder="RPE" />
              </div>
              <div className="col-span-1 flex items-center justify-center pt-1.5">
                <button onClick={() => removeRow(r.key)} className="text-gray-300 hover:text-red-400 transition-colors">✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-1.5 mt-1 px-0.5">
          <p className="col-span-4 text-xs text-gray-400 pl-2">Exercise</p>
          <p className="col-span-2 text-xs text-gray-400 text-center">Sets</p>
          <p className="col-span-2 text-xs text-gray-400 text-center">Reps</p>
          <p className="col-span-2 text-xs text-gray-400 text-center">Weight</p>
          <p className="col-span-1 text-xs text-gray-400 text-center">RPE</p>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" loading={loading} onClick={submit}>Save Workout</Button>
      </div>
    </div>
  );
}

// ── Workout detail / inline edit ──────────────────────────────────────────────
function WorkoutDetail({ workout, onClose, onRefresh }: { workout: Workout; onClose: () => void; onRefresh: () => void }) {
  const [exercises, setExercises] = useState<WorkoutExercise[]>(workout.exercises);
  const [editing,   setEditing]   = useState<number | null>(null);
  const [editData,  setEditData]  = useState<Partial<WorkoutExercise>>({});
  const [saving,    setSaving]    = useState(false);

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
    if (!confirm("Remove this exercise?")) return;
    await workoutsApi.deleteExercise(id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{format(parseISO(workout.date), "EEEE, MMMM d, yyyy")}</span>
        <span>{workout.duration} min{workout.caloriesBurned ? ` · ${Math.round(workout.caloriesBurned)} kcal` : ""}</span>
      </div>
      {workout.notes && <p className="text-sm text-gray-600 italic">{workout.notes}</p>}

      <div className="space-y-2">
        {exercises.map((ex) => (
          <div key={ex.id} className="border border-gray-100 rounded-xl p-3">
            {editing === ex.id ? (
              <div className="grid grid-cols-4 gap-2">
                <input defaultValue={ex.sets}   onChange={(e) => setEditData((d) => ({ ...d, sets:   Number(e.target.value) }))}
                  className="border rounded-lg px-2 py-1.5 text-sm text-center" placeholder="Sets" />
                <input defaultValue={ex.reps}   onChange={(e) => setEditData((d) => ({ ...d, reps:   Number(e.target.value) }))}
                  className="border rounded-lg px-2 py-1.5 text-sm text-center" placeholder="Reps" />
                <input defaultValue={ex.weight ?? ""} onChange={(e) => setEditData((d) => ({ ...d, weight: e.target.value ? Number(e.target.value) : null }))}
                  className="border rounded-lg px-2 py-1.5 text-sm text-center" placeholder="kg" />
                <div className="flex gap-1">
                  <button onClick={() => saveEdit(ex.id)} disabled={saving} className="flex-1 bg-brand-600 text-white rounded-lg text-xs py-1.5">✓</button>
                  <button onClick={() => setEditing(null)} className="flex-1 bg-gray-100 rounded-lg text-xs py-1.5">✕</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{ex.exerciseName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ex.sets} × {ex.reps} reps{ex.weight ? ` @ ${ex.weight} kg` : ""}
                    {ex.rpe ? ` · RPE ${ex.rpe}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditing(ex.id); setEditData({ sets: ex.sets, reps: ex.reps, weight: ex.weight }); }}
                    className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">Edit</button>
                  <button onClick={() => deleteExercise(ex.id)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-red-50 hover:bg-red-100 text-red-600 transition-colors">✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {exercises.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No exercises logged</p>}
      </div>
      <Button variant="secondary" className="w-full" onClick={onClose}>Close</Button>
    </div>
  );
}

// ── Main Workouts page ────────────────────────────────────────────────────────
export default function WorkoutsPage() {
  const [workouts,  setWorkouts]  = useState<Workout[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [selected,  setSelected]  = useState<Workout | null>(null);

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
          <p className="text-gray-500 text-sm mt-1">{total} workouts logged</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Log Workout</Button>
      </div>

      {/* Workout list */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>
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
              <Card key={w.id} onClick={() => setSelected(w)} className="cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-lg font-bold shrink-0">
                      {w.name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{w.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {format(parseISO(w.date), "MMM d, yyyy")} · {w.duration} min · {w.exercises.length} exercises
                      </p>
                      {w.exercises.slice(0, 3).length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {w.exercises.slice(0, 3).map((e) => e.exerciseName).join(" · ")}
                          {w.exercises.length > 3 ? ` +${w.exercises.length - 3} more` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {w.caloriesBurned && (
                      <Badge variant="warning">{Math.round(w.caloriesBurned)} kcal</Badge>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {w.exercises.reduce((s, e) => s + e.sets * e.reps * (e.weight ?? 0), 0).toLocaleString()} kg vol.
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</Button>
              <span className="text-sm text-gray-500 py-1.5">Page {page} of {pages}</span>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => load(page + 1)}>Next →</Button>
            </div>
          )}
        </>
      )}

      {/* Log workout modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Log Workout" size="lg">
        <WorkoutForm onSave={() => { setShowForm(false); load(1); }} onClose={() => setShowForm(false)} />
      </Modal>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name} size="lg">
        {selected && (
          <WorkoutDetail
            workout={selected}
            onClose={() => setSelected(null)}
            onRefresh={() => load(page)}
          />
        )}
      </Modal>
    </div>
  );
}
