import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useTranslation, t as tGlobal } from "../../i18n";

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

/** Turn an API error into a human-readable message */
function parseApiError(err: any): string {
  if (!err.response) {
    return tGlobal("auth.serverUnavailable");
  }

  const data = err.response.data ?? {};
  const status = err.response.status as number;

  if (data.details && Array.isArray(data.details) && data.details.length > 0) {
    return data.details[0].message;
  }

  if (status === 401) return tGlobal("auth.invalidCredentials");
  if (status === 429) return tGlobal("auth.tooManyAttempts");

  return data.error || `Server error (${status}). Please try again.`;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();
  const [banner, setBanner] = useState("");

  const sessionExpired = searchParams.get("sessionExpired") === "1";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ defaultValues: { rememberMe: true } });

  const onSubmit = async (data: LoginForm) => {
    try {
      setBanner("");
      const res = await authApi.login({ email: data.email, password: data.password, rememberMe: data.rememberMe });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate("/dashboard");
    } catch (err: any) {
      setBanner(parseApiError(err));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-white text-2xl font-bold">{t("auth.welcomeBack")}</h1>
          <p className="text-gray-400 mt-1 text-sm">{t("auth.signInDesc")}</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Session-expired banner */}
            {sessionExpired && !banner && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-xl px-4 py-3 flex gap-2">
                <span className="shrink-0">🔒</span>
                <span>{t("auth.sessionExpired")}</span>
              </div>
            )}

            {banner && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{banner}</span>
              </div>
            )}

            <Input
              label={t("auth.email")}
              type="email"
              placeholder="you@example.com"
              {...register("email", {
                required: t("auth.emailRequired"),
                pattern: { value: /\S+@\S+\.\S+/, message: t("auth.validEmail") },
              })}
              error={errors.email?.message}
            />

            <Input
              label={t("auth.password")}
              type="password"
              placeholder="••••••••"
              {...register("password", { required: t("auth.passwordRequired") })}
              error={errors.password?.message}
            />

            {/* Remember me + forgot password row */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  {...register("rememberMe")}
                />
                <span className="text-gray-600 dark:text-gray-300">{t("auth.rememberMe")}</span>
              </label>
              <Link to="/forgot-password" className="text-brand-600 hover:text-brand-700 font-medium">
                {t("auth.forgotPassword")}
              </Link>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              {t("auth.signIn")}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="text-brand-600 font-medium hover:text-brand-700">
              {t("auth.signUp")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
