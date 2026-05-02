import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { applyDark, readDarkPref } from "../../hooks/useDarkMode";
import { useTranslation, LANG_LABELS } from "../../i18n";
import type { SupportedLang } from "../../i18n";
import { usersApi, calorieGoalsApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import type { User } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

// ── Toast ────────────────────────────────────────────────────────────────────
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
    <div className="fixed bottom-20 right-4 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 md:bottom-6 md:right-6">
      <span className="text-green-400">✓</span>
      {msg}
    </div>
  );
}

/** Extracts a user-readable message from an Axios error, including Zod field details.
 *  In development, also appends the raw server detail for easier debugging. */
function parseApiError(e: any): string {
  const data = e?.response?.data;
  if (!data) return e?.message || "Request failed";
  if (data.details?.length) {
    return data.details.map((d: any) => `${d.field ? d.field + ": " : ""}${d.message}`).join(" · ");
  }
  const base = data.error || "Something went wrong";
  if ((import.meta as any).env?.DEV && data.detail && data.detail !== base) {
    return `${base} — [dev: ${data.errorName ? data.errorName + ": " : ""}${data.detail}]`;
  }
  return base;
}

// ── Profile form ──────────────────────────────────────────────────────────────
function ProfileForm() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [activeGoalId, setActiveGoalId] = useState<number | null>(null);

  // Load active goal ID once so we can sync trainingDaysPerWeek to it on save
  useEffect(() => {
    calorieGoalsApi.getActive().then((r) => {
      if (r.data.goal) setActiveGoalId(r.data.goal.id);
    }).catch(() => {});
  }, []);

  const [form, setForm] = useState({
    firstName:           user?.firstName          ?? "",
    lastName:            user?.lastName           ?? "",
    age:                 String(user?.age         ?? ""),
    weight:              String(user?.weight      ?? ""),
    height:              String(user?.height      ?? ""),
    sex:                 user?.sex                ?? "",
    activityLevel:       user?.activityLevel      ?? "",
    fitnessLevel:        user?.fitnessLevel       ?? "",
    goal:                user?.goal               ?? "",
    trainingDaysPerWeek: String(user?.trainingDaysPerWeek ?? ""),
    trainingHoursPerDay: String(user?.trainingHoursPerDay ?? ""),
  });

  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");
  const toast = useToast();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const [planNudge, setPlanNudge] = useState<number | null>(null);

  // Re-sync form when auth store user is updated externally (e.g. WeeklyPlanWidget saves plan)
  useEffect(() => {
    if (!user) return;
    setForm({
      firstName:           user.firstName          ?? "",
      lastName:            user.lastName           ?? "",
      age:                 String(user.age         ?? ""),
      weight:              String(user.weight      ?? ""),
      height:              String(user.height      ?? ""),
      sex:                 user.sex                ?? "",
      activityLevel:       user.activityLevel      ?? "",
      fitnessLevel:        user.fitnessLevel       ?? "",
      goal:                user.goal               ?? "",
      trainingDaysPerWeek: String(user.trainingDaysPerWeek ?? ""),
      trainingHoursPerDay: String(user.trainingHoursPerDay ?? ""),
    });
  // Only re-sync when key scheduling fields change — avoids fighting the user mid-edit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.trainingDaysPerWeek, user?.trainingHoursPerDay]);

  const save = async () => {
    setSaving(true); setError(""); setSuccess(""); setPlanNudge(null);
    try {
      const newDays = form.trainingDaysPerWeek ? Number(form.trainingDaysPerWeek) : null;
      const oldDays = user?.trainingDaysPerWeek ?? null;
      const payload: Partial<User> & Record<string, any> = {
        firstName:           form.firstName           || undefined,
        lastName:            form.lastName            || undefined,
        age:                 form.age                 ? Number(form.age)                 : undefined,
        weight:              form.weight              ? Number(form.weight)              : undefined,
        height:              form.height              ? Number(form.height)              : undefined,
        sex:                 (form.sex as any)        || undefined,
        activityLevel:       (form.activityLevel as any) || undefined,
        fitnessLevel:        form.fitnessLevel        || undefined,
        goal:                form.goal                || undefined,
        trainingDaysPerWeek: newDays,
        trainingHoursPerDay: form.trainingHoursPerDay ? Number(form.trainingHoursPerDay) : null,
      };
      const res = await usersApi.updateProfile(payload);
      updateUser(res.data.user);

      // If training days changed — sync to calorieGoal + show toast
      if (newDays && newDays !== oldDays) {
        try { localStorage.setItem("fitai_plan_days_hint", String(newDays)); } catch { /* ignore */ }
        // Sync training days to the active calorie goal so WorkoutsPage stays in sync
        if (activeGoalId) {
          calorieGoalsApi.update(activeGoalId, { trainingDaysPerWeek: newDays }).catch(() => {});
        }
        setPlanNudge(newDays);
        setTimeout(() => setPlanNudge(null), 8000);
        toast.show(`Training days updated to ${newDays}! 💪`);
      } else {
        setSuccess("Profile saved!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (e: any) {
      setError(parseApiError(e));
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader title="Profile" subtitle="Used by the AI and calorie calculator" />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-4">{success}</p>}
      {planNudge && (
        <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2 mb-4">
          <span className="text-sm text-brand-700 flex-1">
            ✅ Profile saved — training days changed to <strong>{planNudge}</strong>. Update your weekly schedule to match.
          </span>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm font-semibold text-brand-600 hover:text-brand-800 whitespace-nowrap"
          >
            Go to plan →
          </button>
        </div>
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="First Name" value={form.firstName} onChange={set("firstName")} placeholder="Alex" />
          <Input label="Last Name"  value={form.lastName}  onChange={set("lastName")}  placeholder="Smith" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Age" type="number" value={form.age}    onChange={set("age")}    placeholder="25" min="13" max="120" />
          <Input label="Weight (kg)" type="number" step="0.1" value={form.weight} onChange={set("weight")} placeholder="75" />
          <Input label="Height (cm)" type="number" value={form.height} onChange={set("height")} placeholder="178" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Sex"
            value={form.sex}
            onChange={set("sex")}
            placeholder="Select sex"
            options={[
              { value: "male",   label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
          <Select
            label="Activity Level (non-training)"
            value={form.activityLevel}
            onChange={set("activityLevel")}
            placeholder="Select activity level"
            options={[
              { value: "sedentary",  label: "Sedentary (desk job)" },
              { value: "light",      label: "Light (on feet most of the day)" },
              { value: "moderate",   label: "Moderate (active job)" },
              { value: "active",     label: "Active (manual labour)" },
              { value: "very_active",label: "Very Active (physical job + sport)" },
            ]}
          />
        </div>

        {/* Training schedule — drives precise TDEE when both are filled */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Training Schedule</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Days per week"
              value={form.trainingDaysPerWeek}
              onChange={set("trainingDaysPerWeek")}
              placeholder="Select days"
              options={[
                { value: "1", label: "1 day / week" },
                { value: "2", label: "2 days / week" },
                { value: "3", label: "3 days / week" },
                { value: "4", label: "4 days / week" },
                { value: "5", label: "5 days / week" },
                { value: "6", label: "6 days / week" },
                { value: "7", label: "7 days / week" },
              ]}
            />
            <Select
              label="Hours per session"
              value={form.trainingHoursPerDay}
              onChange={set("trainingHoursPerDay")}
              placeholder="Select duration"
              options={[
                { value: "0.5",  label: "~30 min" },
                { value: "0.75", label: "~45 min" },
                { value: "1",    label: "1 hour" },
                { value: "1.25", label: "1 h 15 min" },
                { value: "1.5",  label: "1 h 30 min" },
                { value: "1.75", label: "1 h 45 min" },
                { value: "2",    label: "2 hours" },
                { value: "2.5",  label: "2 h 30 min" },
                { value: "3",    label: "3 hours" },
              ]}
            />
          </div>
          {form.trainingDaysPerWeek && form.trainingHoursPerDay && (
            <p className="text-xs text-brand-600 mt-2 font-medium">
              ✓ {Number(form.trainingDaysPerWeek)} days × {Number(form.trainingHoursPerDay) < 1
                ? `${Math.round(Number(form.trainingHoursPerDay) * 60)} min`
                : `${Number(form.trainingHoursPerDay)} h`} — calorie goals will use precise MET-based TDEE
            </p>
          )}
        </div>

        <Select
          label="Fitness Level"
          value={form.fitnessLevel}
          onChange={set("fitnessLevel")}
          placeholder="Select fitness level"
          options={[
            { value: "beginner",     label: "Beginner (< 1 year training)" },
            { value: "intermediate", label: "Intermediate (1–3 years)" },
            { value: "advanced",     label: "Advanced (3+ years)" },
          ]}
        />

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
            Active Goal
            {form.goal && (
              <span className="ml-2 text-xs font-normal text-gray-400">(set from Goals tab — edit freely)</span>
            )}
          </label>
          <textarea
            value={form.goal}
            onChange={set("goal")}
            rows={2}
            placeholder="Set a goal in the Goals tab, or describe it here — e.g. Lose 10kg for summer…"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-1">Why this matters</p>
          <p>Age, weight, height, and sex are used for Mifflin-St Jeor BMR. When you set your <strong>training days and session duration</strong>, calorie goals switch to a precise MET-based TDEE that accounts for actual exercise calories burned — more accurate than the activity multiplier alone. All goal calculations, nutrition targets, and progress projections depend on this.</p>
        </div>

        <Button loading={saving} onClick={save} className="w-full">Save Profile</Button>
      </div>
      <ToastBanner msg={toast.msg} />
    </Card>
  );
}

// ── Nutrition preferences ─────────────────────────────────────────────────────
function NutritionPreferencesForm() {
  const { user, updateUser } = useAuthStore();
  const [multiplier, setMultiplier] = useState(user?.proteinMultiplier ?? 2.0);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");

  // Keep in sync if user object updates from parent
  useEffect(() => {
    if (user?.proteinMultiplier != null) setMultiplier(user.proteinMultiplier);
  }, [user?.proteinMultiplier]);

  const save = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await usersApi.updateProfile({ proteinMultiplier: multiplier } as any);
      updateUser(res.data.user);
      setSuccess("Preferences saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(parseApiError(e));
    } finally { setSaving(false); }
  };

  const pct  = ((multiplier - 0.8) / (3.0 - 0.8)) * 100;
  const exKg = user?.weight ? Math.round(user.weight * multiplier) : null;

  return (
    <Card>
      <CardHeader title="Nutrition Preferences" subtitle="Applied to all new calorie goal calculations" />

      {error   && <p className="text-sm text-red-600   bg-red-50   rounded-xl px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-4">{success}</p>}

      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Protein target
            </label>
            <span className="text-lg font-bold text-brand-600">{multiplier.toFixed(1)} g/kg</span>
          </div>

          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min={0.8} max={3.0} step={0.1}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-brand-500, #6366f1) 0%, var(--color-brand-500, #6366f1) ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.8</span>
              <span>1.1</span>
              <span>1.4</span>
              <span>1.6</span>
              <span>1.8</span>
              <span>2.0</span>
              <span>2.4</span>
              <span>3.0</span>
            </div>
          </div>

          {/* Live preview */}
          {exKg != null && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              At your current weight ({user!.weight} kg) → <span className="font-semibold text-gray-700 dark:text-gray-200">{exKg} g protein / day</span>
            </p>
          )}

          {/* Warning */}
          {multiplier > 2.5 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
              ⚠️ Values above 2.5 g/kg are at the high end — typically only relevant for advanced athletes in aggressive cuts. Make sure overall calories and fat intake aren't being compromised.
            </p>
          )}
        </div>

        {/* Reference table */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">Common ranges</p>
          {[
            { range: "0.8 – 1.0", label: "Sedentary / general health (RDA minimum)" },
            { range: "1.2 – 1.6", label: "Recreational fitness, moderate training" },
            { range: "1.6 – 2.0", label: "Strength / hypertrophy training (recommended)" },
            { range: "2.0 – 2.5", label: "Cutting phase — high-protein to preserve muscle" },
            { range: "2.5 – 3.0", label: "Advanced athletes / aggressive cut (elite use)" },
          ].map((row) => (
            <div key={row.range} className="flex gap-3">
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0">{row.range}</span>
              <span>{row.label}</span>
            </div>
          ))}
        </div>

        <Button loading={saving} onClick={save} className="w-full">Save Preferences</Button>
      </div>
    </Card>
  );
}

// ── Injury tracking ───────────────────────────────────────────────────────────
const INJURY_AREAS = [
  { id: "lower_back",       label: "Lower Back" },
  { id: "upper_back",       label: "Upper Back / Neck" },
  { id: "knee_left",        label: "Knee (Left)" },
  { id: "knee_right",       label: "Knee (Right)" },
  { id: "shoulder_left",    label: "Shoulder (Left)" },
  { id: "shoulder_right",   label: "Shoulder (Right)" },
  { id: "hip",              label: "Hip" },
  { id: "elbow_left",       label: "Elbow (Left)" },
  { id: "elbow_right",      label: "Elbow (Right)" },
  { id: "wrist_left",       label: "Wrist (Left)" },
  { id: "wrist_right",      label: "Wrist (Right)" },
  { id: "ankle_left",       label: "Ankle (Left)" },
  { id: "ankle_right",      label: "Ankle (Right)" },
  { id: "rotator_cuff",     label: "Rotator Cuff" },
  { id: "hamstring",        label: "Hamstring" },
  { id: "it_band",          label: "IT Band" },
  { id: "plantar_fascia",   label: "Plantar Fascia" },
];

function InjuryForm() {
  const { user, updateUser } = useAuthStore();
  const [selected, setSelected] = useState<string[]>(user?.injuries ?? []);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");

  useEffect(() => { setSelected(user?.injuries ?? []); }, [user?.injuries]);

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const save = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await usersApi.updateProfile({ injuries: selected } as any);
      updateUser(res.data.user);
      setSuccess("Injuries saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(parseApiError(e));
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader title="Injuries & Limitations" subtitle="Exercises and templates will avoid movements that stress affected areas" />

      {error   && <p className="text-sm text-red-600   bg-red-50   rounded-xl px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-4">{success}</p>}

      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Select any areas where you have pain, discomfort, or are recovering from injury:</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INJURY_AREAS.map(({ id, label }) => {
            const active = selected.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-left transition-all ${
                  active
                    ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 text-red-700 dark:text-red-400 font-medium"
                    : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${active ? "border-red-400 bg-red-400" : "border-gray-300 dark:border-gray-500"}`}>
                  {active && <span className="text-white text-[10px] leading-none">✓</span>}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <p className="font-medium mb-1">⚠️ Active limitations: {selected.length} area{selected.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-amber-600">
              Workout suggestions and exercise replacement options will avoid stressing these areas.
              Always consult a physiotherapist before returning to full training.
            </p>
          </div>
        )}

        <Button loading={saving} onClick={save} className="w-full">Save Injuries</Button>
      </div>
    </Card>
  );
}

// ── Female cycle tracking ─────────────────────────────────────────────────────
function CycleTrackingForm() {
  const { user, updateUser } = useAuthStore();
  const [periodStart, setPeriodStart] = useState(user?.periodStart ?? "");
  const [cycleLength, setCycleLength] = useState(String(user?.cycleLength ?? 28));
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");

  useEffect(() => {
    setPeriodStart(user?.periodStart ?? "");
    setCycleLength(String(user?.cycleLength ?? 28));
  }, [user?.periodStart, user?.cycleLength]);

  const save = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await usersApi.updateProfile({
        periodStart: periodStart || null,
        cycleLength:  periodStart ? Number(cycleLength) : null,
      } as any);
      updateUser(res.data.user);
      setSuccess("Cycle settings saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(parseApiError(e));
    } finally { setSaving(false); }
  };

  // Compute current phase if data is available
  const phase = (() => {
    if (!periodStart) return null;
    const start = new Date(periodStart);
    const today = new Date();
    const daysSince = Math.floor((today.getTime() - start.getTime()) / 86400000);
    const cl = Number(cycleLength) || 28;
    const dayOfCycle = ((daysSince % cl) + cl) % cl + 1;
    if (dayOfCycle <= 5)  return { name: "Menstruation",  color: "bg-red-50 border-red-200 text-red-800",    day: dayOfCycle };
    if (dayOfCycle <= 13) return { name: "Follicular",    color: "bg-green-50 border-green-200 text-green-800", day: dayOfCycle };
    if (dayOfCycle <= 16) return { name: "Ovulation",     color: "bg-yellow-50 border-yellow-200 text-yellow-800", day: dayOfCycle };
    return                       { name: "Luteal",        color: "bg-purple-50 border-purple-200 text-purple-800", day: dayOfCycle };
  })();

  return (
    <Card>
      <CardHeader title="Menstrual Cycle Tracking" subtitle="Personalises nutrition & workout tips to your hormonal phase" />

      {error   && <p className="text-sm text-red-600   bg-red-50   rounded-xl px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-4">{success}</p>}

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">First day of last period</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Cycle length (days)</label>
            <input
              type="number"
              min={20} max={45}
              value={cycleLength}
              onChange={(e) => setCycleLength(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">Average is 28 days (range: 21–35)</p>
          </div>
        </div>

        {phase && (
          <div className={`border rounded-xl px-4 py-3 ${phase.color}`}>
            <p className="font-semibold text-sm">You are currently in: {phase.name} phase (Day {phase.day})</p>
            <p className="text-xs mt-1 opacity-80">
              {{
                Menstruation: "Focus on iron-rich foods (red meat, lentils, spinach), anti-inflammatory foods, and gentle movement. Rest more if needed.",
                Follicular:   "Rising oestrogen boosts energy and mood — great time for higher intensity training and increasing carbs slightly.",
                Ovulation:    "Peak energy and strength. Push harder in the gym. Great time for new PRs and high-intensity cardio.",
                Luteal:       "Progesterone rises — you may crave carbs and feel more fatigued. Increase magnesium (dark chocolate, nuts, seeds) and prioritise sleep.",
              }[phase.name]}
            </p>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p className="font-medium text-gray-600 dark:text-gray-300">Why this matters</p>
          <p>Hormonal fluctuations affect energy, strength, hunger, and recovery throughout the cycle. Tailoring nutrition and training intensity to each phase can reduce symptoms and improve performance.</p>
        </div>

        <Button loading={saving} onClick={save} className="w-full">Save Cycle Settings</Button>
      </div>
    </Card>
  );
}

// ── Language Picker ──────────────────────────────────────────────────────────
function LanguagePicker() {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">🌐 {t("profile.language")}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Choose the display language for the app</p>
      </div>
      <div className="flex gap-1.5">
        {(Object.entries(LANG_LABELS) as [SupportedLang, string][]).map(([code, label]) => (
          <button
            key={code}
            type="button"
            onClick={() => i18n.changeLanguage(code)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              i18n.language === code
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-brand-400"
            }`}
          >
            {code === "en" ? "🇬🇧" : "🇪🇸"} {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── App Preferences ───────────────────────────────────────────────────────────
type AppPrefs = { trackWater: boolean; darkMode: boolean };

function AppPreferencesForm() {
  const initPrefs = (): AppPrefs => {
    try {
      const s = localStorage.getItem("app_prefs_v1");
      if (s) return { trackWater: true, darkMode: readDarkPref(), ...JSON.parse(s) };
    } catch { /* ignore */ }
    return { trackWater: true, darkMode: readDarkPref() };
  };
  const [prefs, setPrefs] = useState<AppPrefs>(initPrefs);
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof AppPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("app_prefs_v1", JSON.stringify(next)); } catch { /* ignore */ }
      if (key === "darkMode") applyDark(next.darkMode);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return next;
    });
  };

  const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        on ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );

  return (
    <Card>
      <CardHeader title="App Preferences" subtitle="Controls appearance and tracking features" />
      {saved && <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 rounded-xl px-3 py-2 mb-4">Preferences saved</p>}
      <div className="space-y-1">

        {/* Dark mode */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">🌙 Dark Mode</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Switch the app to a dark colour scheme</p>
          </div>
          <Toggle on={prefs.darkMode} onClick={() => toggle("darkMode")} />
        </div>

        {/* Language picker */}
        <LanguagePicker />

        {/* Water tracking */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">💧 Water Tracking</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Show the water intake widget on the Nutrition page</p>
          </div>
          <Toggle on={prefs.trackWater} onClick={() => toggle("trackWater")} />
        </div>

      </div>
    </Card>
  );
}

// ── Change password form ──────────────────────────────────────────────────────
function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState("");
  const [error,   setError]   = useState("");

  const save = async () => {
    if (next !== confirm) { setError("New passwords do not match"); return; }
    if (next.length < 8)  { setError("Password must be at least 8 characters"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      await usersApi.changePassword({ currentPassword: current, newPassword: next });
      setSuccess("Password updated successfully!");
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(parseApiError(e));
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader title="Change Password" />
      {error   && <p className="text-sm text-red-600   bg-red-50   rounded-xl px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-4">{success}</p>}
      <div className="space-y-4">
        <Input label="Current Password" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" />
        <Input label="New Password"     type="password" value={next}    onChange={(e) => setNext(e.target.value)}    placeholder="••••••••" hint="At least 8 characters" />
        <Input label="Confirm Password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
        <Button loading={saving} onClick={save} className="w-full">Update Password</Button>
      </div>
    </Card>
  );
}

// ── Account info ──────────────────────────────────────────────────────────────
function AccountInfo() {
  const { user } = useAuthStore();
  if (!user) return null;
  return (
    <Card>
      <CardHeader title="Account" />
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Username</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">@{user.username}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Email</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">{user.email}</span>
        </div>
        {user.createdAt && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Member since</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();

  // Refresh profile from server on mount
  useEffect(() => {
    usersApi.getProfile().then((r) => updateUser(r.data.user)).catch(() => {});
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("profile.title")}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t("profile.manageProfile")}</p>
      </div>

      <AccountInfo />
      <ProfileForm />
      <NutritionPreferencesForm />
      <AppPreferencesForm />
      <InjuryForm />
      {user?.sex === "female" && <CycleTrackingForm />}
      <PasswordForm />

      {/* Data export */}
      <Card>
        <CardHeader title={t("profile.yourData")} subtitle="Download a complete copy of your fitness data" />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Exports workouts, food logs, weight history, and goals as a JSON file.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              const token = localStorage.getItem("accessToken");
              const a = document.createElement("a");
              a.href = `/api/users/export`;
              fetch("/api/users/export", { headers: { Authorization: `Bearer ${token}` } })
                .then((r) => r.blob())
                .then((blob) => {
                  const url = URL.createObjectURL(blob);
                  a.href = url;
                  a.download = `fitai-export-${new Date().toISOString().slice(0,10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                });
            }}
          >
            ⬇ Download my data
          </Button>
        </div>
      </Card>

      {/* ── Danger Zone ───────────────────────────────────────────────────── */}
      <DangerZone />
    </div>
  );
}

// ── Danger Zone component ─────────────────────────────────────────────────────
function DangerZone() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [resetConfirm,  setResetConfirm]  = useState(false);
  const [resetBusy,     setResetBusy]     = useState(false);
  const [resetDone,     setResetDone]     = useState(false);
  const { t } = useTranslation();

  const handleReset = async () => {
    setResetBusy(true);
    try {
      await usersApi.resetAllData();
      setResetDone(true);
      setResetConfirm(false);
      setTimeout(() => setResetDone(false), 4000);
    } catch { /* silent */ }
    finally { setResetBusy(false); }
  };

  return (
    <Card className="border border-red-200 dark:border-red-900/50">
      <CardHeader
        title={`⚠️ ${t("profile.dangerZone")}`}
        subtitle="Irreversible actions — proceed with caution"
      />
      <div className="space-y-4">
        {/* Reset all data */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t("profile.resetAllData")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Deletes all workouts, food logs, weight history, water logs, and goals.
              Your account and profile stay intact.
            </p>
          </div>
          {resetDone ? (
            <span className="text-sm text-green-600 font-medium whitespace-nowrap">✅ {t("profile.resetDataSuccess")}</span>
          ) : resetConfirm ? (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="secondary" onClick={() => setResetConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                loading={resetBusy}
                onClick={handleReset}
              >
                Yes, delete everything
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white shrink-0"
              onClick={() => setResetConfirm(true)}
            >
              Reset all data
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
