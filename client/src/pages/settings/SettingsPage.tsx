import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { applyColorTheme, applyDark, readColorThemePref, readDarkPref } from "../../hooks/useDarkMode";
import { emitAppPrefsChanged, emitWeightLogged } from "../../lib/appEvents";
import { useTranslation, LANG_LABELS, t as _t } from "../../i18n";
import type { SupportedLang } from "../../i18n";
import { usersApi, calorieGoalsApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import type { User } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";

type ProfileUpdatePayload = {
  firstName?: string;
  lastName?: string;
  age?: number;
  weight?: number;
  height?: number;
  sex?: User["sex"];
  activityLevel?: User["activityLevel"];
  fitnessLevel?: string;
  goal?: string;
  trainingDaysPerWeek?: number | null;
  trainingHoursPerDay?: number | null;
  planAdjustmentMode?: User["planAdjustmentMode"];
};

// â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = (message: string) => {
    setMsg(message);
    setTimeout(() => setMsg(null), 3000);
  };
  return { msg, show };
}
function ToastBanner({ msg }: { msg: string | null }) {
  const { t } = useTranslation();
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

// â”€â”€ Profile form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProfileForm() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const [activeGoalId, setActiveGoalId] = useState<number | null>(null);
  const [weightConfirmOpen, setWeightConfirmOpen] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<ProfileUpdatePayload | null>(null);

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
    planAdjustmentMode:  user?.planAdjustmentMode ?? "suggest",
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
      planAdjustmentMode:  user.planAdjustmentMode ?? "suggest",
    });
  // Only re-sync when key scheduling fields change â€” avoids fighting the user mid-edit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.trainingDaysPerWeek, user?.trainingHoursPerDay]);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      weight: String(user.weight ?? ""),
    }));
  }, [user?.weight]);

  const buildPayload = (): ProfileUpdatePayload => ({
    firstName: form.firstName || undefined,
    lastName: form.lastName || undefined,
    age: form.age ? Number(form.age) : undefined,
    weight: form.weight ? Number(form.weight) : undefined,
    height: form.height ? Number(form.height) : undefined,
    sex: (form.sex as User["sex"]) || undefined,
    activityLevel: (form.activityLevel as User["activityLevel"]) || undefined,
    fitnessLevel: form.fitnessLevel || undefined,
    goal: form.goal || undefined,
    trainingDaysPerWeek: form.trainingDaysPerWeek ? Number(form.trainingDaysPerWeek) : null,
    trainingHoursPerDay: form.trainingHoursPerDay ? Number(form.trainingHoursPerDay) : null,
    planAdjustmentMode: form.planAdjustmentMode as User["planAdjustmentMode"],
  });

  const commitSave = async (payload: ProfileUpdatePayload) => {
    setSaving(true); setError(""); setSuccess(""); setPlanNudge(null);
    try {
      const newDays = payload.trainingDaysPerWeek ?? null;
      const oldDays = user?.trainingDaysPerWeek ?? null;
      const oldWeight = user?.weight ?? null;
      const newWeight = payload.weight ?? null;

      const res = await usersApi.updateProfile(payload);
      updateUser(res.data.user);

      if (newWeight && newWeight !== oldWeight) {
        emitWeightLogged(newWeight);
        toast.show(`Logged ${newWeight} kg as your current weight ✓`);
      }

      if (newDays && newDays !== oldDays) {
        try { localStorage.setItem("fitai_plan_days_hint", String(newDays)); } catch { /* ignore */ }
        if (activeGoalId) {
          calorieGoalsApi.update(activeGoalId, { trainingDaysPerWeek: newDays }).catch(() => {});
        }
        setPlanNudge(newDays);
        setTimeout(() => setPlanNudge(null), 8000);
        if (!newWeight || newWeight === oldWeight) toast.show(`Training days updated to ${newDays}! 💪`);
      } else if (!newWeight || newWeight === oldWeight) {
        setSuccess("Profile saved!");
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (e: any) {
      setError(parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    setError(""); setSuccess(""); setPlanNudge(null);
    const payload = buildPayload();
    const oldWeight = user?.weight ?? null;
    const newWeight = payload.weight ?? null;

    if (newWeight && newWeight !== oldWeight) {
      setPendingProfile(payload);
      setWeightConfirmOpen(true);
      return;
    }

    await commitSave(payload);
  };

  const confirmWeightSave = async () => {
    if (!pendingProfile) return;
    const payload = pendingProfile;
    setPendingProfile(null);
    setWeightConfirmOpen(false);
    await commitSave(payload);
  };

  const cancelWeightSave = () => {
    setPendingProfile(null);
    setWeightConfirmOpen(false);
  };

  return (
    <Card>
      <CardHeader title={t("profile.title")} subtitle={t("settings.usedByAI")} />

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
          <Input label={t("profile.firstName")} value={form.firstName} onChange={set("firstName")} placeholder="Alex" />
          <Input label={t("profile.lastName")}  value={form.lastName}  onChange={set("lastName")}  placeholder="Smith" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label={t("profile.age")} type="number" value={form.age}    onChange={set("age")}    placeholder="25" min="13" max="120" />
          <Input label={t("profile.weightKg")} type="number" step="0.1" value={form.weight} onChange={set("weight")} placeholder="75" />
          <Input label={t("profile.heightCm")} type="number" value={form.height} onChange={set("height")} placeholder="178" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label={t("settings.selectSex")}
            value={form.sex}
            onChange={set("sex")}
            placeholder={t("settings.selectSex")}
            options={[
              { value: "male",   label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
          <Select
            label={t("settings.selectActivityLevel")}
            value={form.activityLevel}
            onChange={set("activityLevel")}
            placeholder={t("settings.selectActivityLevel")}
            options={[
              { value: "sedentary",  label: "Sedentary (desk job)" },
              { value: "light",      label: "Light (on feet most of the day)" },
              { value: "moderate",   label: "Moderate (active job)" },
              { value: "active",     label: "Active (manual labour)" },
              { value: "very_active",label: "Very Active (physical job + sport)" },
            ]}
          />
        </div>

        {/* Training schedule â€” drives precise TDEE when both are filled */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">{t("settings.trainingSchedule")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t("settings.daysPerWeek")}
              value={form.trainingDaysPerWeek}
              onChange={set("trainingDaysPerWeek")}
              placeholder={t("settings.selectDays")}
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
              label={t("settings.hoursPerSession")}
              value={form.trainingHoursPerDay}
              onChange={set("trainingHoursPerDay")}
              placeholder={t("settings.selectDuration")}
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
          label={t("settings.fitnessLevel")}
          value={form.fitnessLevel}
          onChange={set("fitnessLevel")}
          placeholder={t("settings.selectFitnessLevel")}
          options={[
            { value: "beginner",     label: "Beginner (< 1 year training)" },
            { value: "intermediate", label: "Intermediate (1â€“3 years)" },
            { value: "advanced",     label: "Advanced (3+ years)" },
          ]}
        />

        <Select
          label="Adaptive plan adjustments"
          value={form.planAdjustmentMode}
          onChange={set("planAdjustmentMode")}
          placeholder="Choose adjustment mode"
          options={[
            { value: "suggest", label: "Suggest only" },
            { value: "confirm", label: "One-click apply with confirmation" },
            { value: "auto", label: "Auto-adjust calories/macros" },
          ]}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 -mt-3">
          Auto mode can tune calories and macros when confidence is high, but goal dates are only suggested for approval.
        </p>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
            Active Goal
            {form.goal && (
              <span className="ml-2 text-xs font-normal text-gray-400">(set from Goals tab â€” edit freely)</span>
            )}
          </label>
          <textarea
            value={form.goal}
            onChange={set("goal")}
            rows={2}
            placeholder={t("settings.goalDescription")}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-1">{t("settings.whyMatters")}</p>
          <p>Age, weight, height, and sex are used for Mifflin-St Jeor BMR. When you set your <strong>training days and session duration</strong>, calorie goals switch to a precise MET-based TDEE that accounts for actual exercise calories burned â€” more accurate than the activity multiplier alone. All goal calculations, nutrition targets, and progress projections depend on this.</p>
        </div>

        <Button loading={saving} onClick={save} className="w-full">{t("profile.saveProfile")}</Button>
        <Modal open={weightConfirmOpen} onClose={cancelWeightSave} title={t("common.confirm")} size="sm">
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Are you sure you want to log this as your current weight?
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              This will save your updated profile and overwrite today&apos;s weight entry if one already exists.
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={cancelWeightSave}>
                Cancel
              </Button>
              <Button className="flex-1" loading={saving} onClick={confirmWeightSave}>
                Log weight
              </Button>
            </div>
          </div>
        </Modal>
      </div>
      <ToastBanner msg={toast.msg} />
    </Card>
  );
}

// â”€â”€ Nutrition preferences â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function NutritionPreferencesForm() {
  const { t } = useTranslation();
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
      <CardHeader title={t("profile.nutritionPreferences")} subtitle="Applied to all new calorie goal calculations" />

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
          <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{t("settings.commonRanges")}</p>
          {[
            { range: "0.8 â€“ 1.0", label: "Sedentary / general health (RDA minimum)" },
            { range: "1.2 â€“ 1.6", label: "Recreational fitness, moderate training" },
            { range: "1.6 â€“ 2.0", label: "Strength / hypertrophy training (recommended)" },
            { range: "2.0 â€“ 2.5", label: "Cutting phase â€” high-protein to preserve muscle" },
            { range: "2.5 â€“ 3.0", label: "Advanced athletes / aggressive cut (elite use)" },
          ].map((row) => (
            <div key={row.range} className="flex gap-3">
              <span className="font-mono text-xs text-gray-500 dark:text-gray-400 w-24 shrink-0">{row.range}</span>
              <span>{row.label}</span>
            </div>
          ))}
        </div>

        <Button loading={saving} onClick={save} className="w-full">{t("settings.savePreferences")}</Button>
      </div>
    </Card>
  );
}

// â”€â”€ Injury tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const INJURY_AREAS = [
  { id: "lower_back",       key: "settings.injuryLowerBack" },
  { id: "upper_back",       key: "settings.injuryUpperBack" },
  { id: "knee_left",        key: "settings.injuryKneeLeft" },
  { id: "knee_right",       key: "settings.injuryKneeRight" },
  { id: "shoulder_left",    key: "settings.injuryShoulderLeft" },
  { id: "shoulder_right",   key: "settings.injuryShoulderRight" },
  { id: "hip",              key: "settings.injuryHip" },
  { id: "elbow_left",       key: "settings.injuryElbowLeft" },
  { id: "elbow_right",      key: "settings.injuryElbowRight" },
  { id: "wrist_left",       key: "settings.injuryWristLeft" },
  { id: "wrist_right",      key: "settings.injuryWristRight" },
  { id: "ankle_left",       key: "settings.injuryAnkleLeft" },
  { id: "ankle_right",      key: "settings.injuryAnkleRight" },
  { id: "rotator_cuff",     key: "settings.injuryRotatorCuff" },
  { id: "hamstring",        key: "settings.injuryHamstring" },
  { id: "it_band",          key: "settings.injuryItBand" },
  { id: "plantar_fascia",   key: "settings.injuryPlantarFascia" },
];

function InjuryForm() {
  const { t } = useTranslation();
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
      setSuccess(t("settings.injuriesSaved"));
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(parseApiError(e));
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader title={t("profile.injuriesForm")} subtitle={t("settings.injuriesExercises")} />

      {error   && <p className="text-sm text-red-600   bg-red-50   rounded-xl px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-4">{success}</p>}

      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("settings.injurySelectHelp")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {INJURY_AREAS.map(({ id, key }) => {
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
                {t(key as any)}
              </button>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <p className="font-medium mb-1">⚠️ {t("settings.activeLimitations", { count: selected.length })}</p>
            <p className="text-xs text-amber-600">
              {t("settings.injuryWarning")}
            </p>
          </div>
        )}

        <Button loading={saving} onClick={save} className="w-full">{t("settings.saveInjuries")}</Button>
      </div>
    </Card>
  );
}

// â”€â”€ Female cycle tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CycleTrackingForm() {
  const { t } = useTranslation();
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
      <CardHeader title={t("settings.menstrualCycleTracking")} subtitle="Personalises nutrition & workout tips to your hormonal phase" />

      {error   && <p className="text-sm text-red-600   bg-red-50   rounded-xl px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-4">{success}</p>}

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">{t("settings.firstDayPeriod")}</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">{t("settings.cycleLength")}</label>
            <input
              type="number"
              min={20} max={45}
              value={cycleLength}
              onChange={(e) => setCycleLength(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">{t("settings.avgCycleLength")}</p>
          </div>
        </div>

        {phase && (
          <div className={`border rounded-xl px-4 py-3 ${phase.color}`}>
            <p className="font-semibold text-sm">You are currently in: {phase.name} phase (Day {phase.day})</p>
            <p className="text-xs mt-1 opacity-80">
              {{
                Menstruation: "Focus on iron-rich foods (red meat, lentils, spinach), anti-inflammatory foods, and gentle movement. Rest more if needed.",
                Follicular:   "Rising oestrogen boosts energy and mood â€” great time for higher intensity training and increasing carbs slightly.",
                Ovulation:    "Peak energy and strength. Push harder in the gym. Great time for new PRs and high-intensity cardio.",
                Luteal:       "Progesterone rises â€” you may crave carbs and feel more fatigued. Increase magnesium (dark chocolate, nuts, seeds) and prioritise sleep.",
              }[phase.name]}
            </p>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p className="font-medium text-gray-600 dark:text-gray-300">{t("settings.whyMatters")}</p>
          <p>Hormonal fluctuations affect energy, strength, hunger, and recovery throughout the cycle. Tailoring nutrition and training intensity to each phase can reduce symptoms and improve performance.</p>
        </div>

        <Button loading={saving} onClick={save} className="w-full">{t("settings.saveCycleSettings")}</Button>
      </div>
    </Card>
  );
}

// â”€â”€ Language Picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const flags: Record<SupportedLang, string> = { en: "🇬🇧", es: "🇪🇸", uk: "🇺🇦" };

  const handleLangChange = (code: SupportedLang) => {
    if (code === i18n.language) return;
    i18n.changeLanguage(code);
    toast.show(_t("dashboard.languageChanged"));
  };

  return (
    <>
      <ToastBanner msg={toast.msg} />
      <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">🌐 {t("profile.language")}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("profile.changeLanguage")}</p>
        </div>
        <div className="flex gap-1.5">
          {(Object.entries(LANG_LABELS) as [SupportedLang, string][]).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => handleLangChange(code as SupportedLang)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                i18n.language === code
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-brand-400"
              }`}
            >
              {flags[code]} {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// â”€â”€ App Preferences â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type AppPrefs = { trackWater: boolean; darkMode: boolean; colorTheme: "default" | "black-gold" | "white-green" };

function AppPreferencesForm() {
  const { t } = useTranslation();
  const initPrefs = (): AppPrefs => {
    try {
      const s = localStorage.getItem("app_prefs_v1");
      if (s) return { trackWater: true, darkMode: readDarkPref(), colorTheme: readColorThemePref(), ...JSON.parse(s) };
    } catch { /* ignore */ }
    return { trackWater: true, darkMode: readDarkPref(), colorTheme: readColorThemePref() };
  };
  const [prefs, setPrefs] = useState<AppPrefs>(initPrefs);
  const [saved, setSaved] = useState(false);

  const toggle = (key: keyof AppPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("app_prefs_v1", JSON.stringify(next)); } catch { /* ignore */ }
      if (key === "darkMode") applyDark(next.darkMode);
      applyColorTheme(next.colorTheme);
      emitAppPrefsChanged();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return next;
    });
  };

  const updateColorTheme = (value: AppPrefs["colorTheme"]) => {
    setPrefs((prev) => {
      const next = { ...prev, colorTheme: value };
      try { localStorage.setItem("app_prefs_v1", JSON.stringify(next)); } catch { /* ignore */ }
      applyColorTheme(next.colorTheme);
      emitAppPrefsChanged();
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
      <CardHeader title={t("profile.appPreferences")} subtitle={t("settings.controlsAppearance")} />
      {saved && <p className="text-sm text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 rounded-xl px-3 py-2 mb-4">{t("settings.preferenceSaved")}</p>}
      <div className="space-y-1">

        {/* Dark mode */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">🌙 Dark Mode</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("settings.switchDarkMode")}</p>
          </div>
          <Toggle on={prefs.darkMode} onClick={() => toggle("darkMode")} />
        </div>

        {/* Language picker */}
        <LanguagePicker />

        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t("settings.colorTheme")}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("settings.colorThemeHelp")}</p>
          </div>
          <div className="w-44 shrink-0">
            <Select
              value={prefs.colorTheme}
              onChange={(e) => updateColorTheme(e.target.value as AppPrefs["colorTheme"])}
              options={[
                { value: "default", label: t("settings.themeOptionDefault") },
                { value: "black-gold", label: t("settings.themeOptionBlackGold") },
                { value: "white-green", label: t("settings.themeOptionWhiteGreen") },
              ]}
            />
          </div>
        </div>

        {/* Water tracking */}
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">💧 Water Tracking</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("settings.showWaterWidget")}</p>
          </div>
          <Toggle on={prefs.trackWater} onClick={() => toggle("trackWater")} />
        </div>

      </div>
    </Card>
  );
}

// â”€â”€ Change password form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PasswordForm() {
  const { t } = useTranslation();
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
      <CardHeader title={t("profile.changePassword")} />
      {error   && <p className="text-sm text-red-600   bg-red-50   rounded-xl px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-4">{success}</p>}
      <div className="space-y-4">
        <Input label={t("settings.currentPassword")} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
        <Input label={t("settings.newPassword")}     type="password" value={next}    onChange={(e) => setNext(e.target.value)}    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" hint={t("settings.passwordHint")} />
        <Input label={t("settings.confirmPasswordField")} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" />
        <Button loading={saving} onClick={save} className="w-full">{t("settings.updatePassword")}</Button>
      </div>
    </Card>
  );
}

// â”€â”€ Account info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AccountInfo() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  if (!user) return null;
  return (
    <Card>
      <CardHeader title="Account" />
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">{t("settings.username")}</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">@{user.username}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">{t("profile.email")}</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">{user.email}</span>
        </div>
        {user.createdAt && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t("settings.memberSince")}</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// â”€â”€ Main Settings page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            â¬‡ Download my data
          </Button>
        </div>
      </Card>

      {/* â”€â”€ Danger Zone â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <DangerZone />
    </div>
  );
}

// â”€â”€ Danger Zone component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

