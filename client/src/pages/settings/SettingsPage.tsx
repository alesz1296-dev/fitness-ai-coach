import { useState, useEffect } from "react";
import { usersApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import type { User } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

// ── Profile form ──────────────────────────────────────────────────────────────
function ProfileForm() {
  const { user, updateUser } = useAuthStore();

  const [form, setForm] = useState({
    firstName:     user?.firstName    ?? "",
    lastName:      user?.lastName     ?? "",
    age:           String(user?.age   ?? ""),
    weight:        String(user?.weight ?? ""),
    height:        String(user?.height ?? ""),
    sex:           user?.sex           ?? "",
    activityLevel: user?.activityLevel ?? "",
    fitnessLevel:  user?.fitnessLevel  ?? "",
    goal:          user?.goal          ?? "",
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
        firstName:     form.firstName     || undefined,
        lastName:      form.lastName      || undefined,
        age:           form.age           ? Number(form.age)    : undefined,
        weight:        form.weight        ? Number(form.weight) : undefined,
        height:        form.height        ? Number(form.height) : undefined,
        sex:           (form.sex as any)  || undefined,
        activityLevel: (form.activityLevel as any) || undefined,
        fitnessLevel:  form.fitnessLevel  || undefined,
        goal:          form.goal          || undefined,
      };
      const res = await usersApi.updateProfile(payload);
      updateUser(res.data.user);
      setSuccess("Profile saved!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to save profile");
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
            label="Activity Level"
            value={form.activityLevel}
            onChange={set("activityLevel")}
            placeholder="Select activity level"
            options={[
              { value: "sedentary",  label: "Sedentary (desk job, no exercise)" },
              { value: "light",      label: "Light (1–2 days/week)" },
              { value: "moderate",   label: "Moderate (3–5 days/week)" },
              { value: "active",     label: "Active (6–7 days/week)" },
              { value: "very_active",label: "Very Active (2× day or physical job)" },
            ]}
          />
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
          <p>Age, weight, height, sex, and activity level are used to calculate your TDEE (total daily energy expenditure) for accurate calorie goals. The AI coach uses your fitness level and goal to personalise advice.</p>
        </div>

        <Button loading={saving} onClick={save} className="w-full">Save Profile</Button>
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
      setError(e.response?.data?.error || "Failed to change password");
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
      <PasswordForm />
    </div>
  );
}
