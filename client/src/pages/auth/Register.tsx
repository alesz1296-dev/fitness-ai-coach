import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

interface RegisterForm {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  firstName?: string;
  lastName?: string;
}

/** Turn an API error into a human-readable message */
function parseApiError(err: any): { banner: string; fields: Record<string, string> } {
  // Network / server unreachable
  if (!err.response) {
    return {
      banner: "Cannot reach the server. Make sure the backend is running on port 3000.",
      fields: {},
    };
  }

  const data = err.response.data ?? {};

  // Zod validation errors — { error: "Validation failed", details: [{field, message}] }
  if (data.details && Array.isArray(data.details)) {
    const fields: Record<string, string> = {};
    for (const d of data.details) {
      if (d.field) fields[d.field] = d.message;
    }
    const banner = data.details.length > 0 ? data.details[0].message : "Validation failed";
    return { banner, fields };
  }

  // Single error string from backend (duplicate email, etc.)
  return { banner: data.error || `Server error (${err.response.status})`, fields: {} };
}

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [banner,    setBanner]    = useState("");
  const [apiFields, setApiFields] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  const password = watch("password");

  const onSubmit = async (data: RegisterForm) => {
    try {
      setBanner("");
      setApiFields({});
      const res = await authApi.register({
        email:     data.email,
        username:  data.username,
        password:  data.password,
        firstName: data.firstName,
        lastName:  data.lastName,
      });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate("/dashboard");
    } catch (err: any) {
      const { banner, fields } = parseApiError(err);
      setBanner(banner);
      setApiFields(fields);

      // Push server-side field errors into react-hook-form so they
      // appear inline under the relevant input
      for (const [field, message] of Object.entries(fields)) {
        if (["email", "username", "password", "confirmPassword"].includes(field)) {
          setError(field as keyof RegisterForm, { message });
        }
      }
    }
  };

  // Merge react-hook-form errors with server field errors
  const fieldError = (name: keyof RegisterForm) =>
    errors[name]?.message || apiFields[name];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-white text-2xl font-bold">Create your account</h1>
          <p className="text-gray-400 mt-1 text-sm">Start your fitness journey today</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Banner error (shown only when there's no inline field error to show) */}
            {banner && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{banner}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" placeholder="Alex"  {...register("firstName")} />
              <Input label="Last Name"  placeholder="Smith" {...register("lastName")}  />
            </div>

            <Input
              label="Username"
              placeholder="alexsmith"
              {...register("username", {
                required: "Username is required",
                minLength: { value: 3, message: "At least 3 characters" },
                pattern: {
                  value: /^[a-zA-Z0-9_]+$/,
                  message: "Letters, numbers, and underscores only",
                },
              })}
              error={fieldError("username")}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              {...register("email", {
                required: "Email is required",
                pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email address" },
              })}
              error={fieldError("email")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              hint="At least 8 characters"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
              })}
              error={fieldError("password")}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (val) => val === password || "Passwords do not match",
              })}
              error={fieldError("confirmPassword")}
            />

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 font-medium hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
