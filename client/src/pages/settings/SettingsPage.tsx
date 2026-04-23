import { useState, useEffect } from "react";
import { usersApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import type { User } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

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

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
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
        trainingDaysPerWeek: form.trainingDaysPerWeek ? Number(form.trainingDaysPerWeek) : null,
        trainingHoursPerDay: form.trainingHoursPerDay ? Number(form.trainingHoursPerDay) : null,
      };
      const res = await usersApi.updateProfile(payload);
      updateUser(res.data.user);
      setSuccess("Profile saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(parseApiError(e));
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader title="Profile" subtitle="Used by the AI and calorie calculator" />

      {error   && <p className="text-sm text-red-600   bg-red-50   rounded-xl px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-4">{success}</p>}

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" value={form.firstName} onChange={set("firstName")} placeholder="Alex" />
          <Input label="Last Name"  value={form.lastName}  onChange={set("lastName")}  placeholder="Smith" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input label="Age" type="number" value={form.age}    onChange={set("age")}    placeholder="25" min="13" max="120" />
          <Input label="Weight (kg)" type="number" step="0.1" value={form.weight} onChange={set("weight")} placeholder="75" />
          <Input label="Height (cm)" type="number" value={form.height} onChange={set("height")} placeholder="178" />
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          <label className="text-sm font-medium text-gray-700 block mb-1">Fitness Goal (optional)</label>
          <textarea
            value={form.goal}
            onChange={set("goal")}
            rows={2}
            placeholder="e.g. Lose 10kg for summer, build a bigger chest, run a 5k…"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </div>

        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-semibold mb-1">Why this matters</p>
          <p>Age, weight, height, and sex are used for Mifflin-St Jeor BMR. When you set your <strong>training days and session duration</strong>, calorie goals switch to a precise MET-based TDEE that accounts for actual exercise calories burned — more accurate than the activity multiplier alone. All goal calculations, nutrition targets, and progress projections depend on this.</p>
        </div>

        <Button loading={saving} onClick={save} className="w-full">Save Profile</Button>
      </div>
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

  const pct  = ((multiplier - 0.8) / (2.2 - 0.8)) * 100;
  const exKg = user?.weight ? Math.round(user.weight * multiplier) : null;

  return (
    <Card>
      <CardHeader title="Nutrition Preferences" subtitle="Applied to all new calorie goal calculations" />

      {error   && <p className="text-sm text-red-600   bg-red-50   rounded-xl px-3 py-2 mb-4">{error}</p>}
      {success && <p className="text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-4">{success}</p>}

      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Protein target
            </label>
            <span className="text-lg font-bold text-brand-600">{multiplier.toFixed(1)} g/kg</span>
          </div>

          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min={0.8} max={2.2} step={0.1}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-brand-500, #6366f1) 0%, var(--color-brand-500, #6366f1) ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.8</span>
              <span>1.0</span>
              <span>1.2</span>
              <span>1.4</span>
              <span>1.6</span>
              <span>1.8</span>
              <span>2.0</span>
              <span>2.2</span>
            </div>
          </div>

          {/* Live preview */}
          {exKg != null && (
            <p className="text-sm text-gray-500 mt-2">
              At your current weight ({user!.weight} kg) → <span className="font-semibold text-gray-700">{exKg} g protein / day</span>
            </p>
          )}

          {/* Warning */}
          {multiplier > 2.2 - 0.05 && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-2">
              ⚠️ Values above 2.2 g/kg are above the range recommended for most athletes. More protein won't translate into extra gains and may crowd out carbs and fats.
            </p>
          )}
        </div>

        {/* Reference table */}
        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
          <p className="font-semibold text-gray-700 mb-2">Common ranges</p>
          {[
            { range: "0.8 – 1.0", label: "Sedentary / general health (RDA minimum)" },
            { range: "1.2 – 1.6", label: "Recreational fitness, moderate training" },
            { range: "1.6 – 2.0", label: "Strength / hypertrophy training (recommended)" },
            { range: "2.0 – 2.2", label: "Cutting phase — high-protein to preserve muscle" },
          ].map((row) => (
            <div key={row.range} className="flex gap-3">
              <span className="font-mono text-xs text-gray-500 w-24 shrink-0">{row.range}</span>
              <span>{row.label}</span>
            </div>
          ))}
        </div>

        <Button loading={saving} onClick={save} className="w-full">Save Preferences</Button>
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
          <span className="text-gray-500">Username</span>
          <span className="font-medium text-gray-800">@{user.username}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Email</span>
          <span className="font-medium text-gray-800">{user.email}</span>
        </div>
        {user.createdAt && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Member since</span>
            <span className="font-medium text-gray-800">
              {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { updateUser } = useAuthStore();

  // Refresh profile from server on mount
  useEffect(() => {
    usersApi.getProfile().then((r) => updateUser(r.data.user)).catch(() => {});
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your profile and account</p>
      </div>

      <AccountInfo />
      <ProfileForm />
      <NutritionPreferencesForm />
      <PasswordForm />
    </div>
  );
}
