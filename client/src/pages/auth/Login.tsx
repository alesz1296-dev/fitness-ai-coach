import { useEffect, useState } from "react";
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

function parseGoogleAuthError(reason: string | null): string {
  switch (reason) {
    case "google_email_unverified":
      return tGlobal("auth.googleEmailUnverified");
    case "google_account_conflict":
      return tGlobal("auth.googleAccountConflict");
    case "access_denied":
      return tGlobal("auth.googleAccessDenied");
    default:
      return tGlobal("auth.googleSignInFailed");
  }
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, isAuthenticated, isHydrating } = useAuthStore();
  const { t } = useTranslation();
  const [banner, setBanner] = useState("");
  const [googlePending, setGooglePending] = useState(false);

  const sessionExpired = searchParams.get("sessionExpired") === "1";
  const googleAuth = searchParams.get("googleAuth");
  const googleReason = searchParams.get("reason");

  useEffect(() => {
    if (!isHydrating && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isHydrating, navigate]);

  useEffect(() => {
    if (googleAuth === "error") {
      setBanner(parseGoogleAuthError(googleReason));
      setGooglePending(false);
      return;
    }

    if (googleAuth !== "success" || isHydrating || isAuthenticated) return;

    let active = true;
    setBanner("");
    setGooglePending(true);

    authApi.refresh()
      .then((res) => {
        if (!active) return;
        setAuth(res.data.user, res.data.accessToken);
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        if (!active) return;
        setBanner(t("auth.googleSignInFailed"));
      })
      .finally(() => {
        if (active) setGooglePending(false);
      });

    return () => {
      active = false;
    };
  }, [googleAuth, googleReason, isAuthenticated, isHydrating, navigate, setAuth, t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ defaultValues: { rememberMe: true } });

  const onSubmit = async (data: LoginForm) => {
    try {
      setBanner("");
      const res = await authApi.login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });
      setAuth(res.data.user, res.data.accessToken);
      navigate("/dashboard");
    } catch (err: any) {
      setBanner(parseApiError(err));
    }
  };

  const startGoogleAuth = () => {
    setBanner("");
    window.location.href = authApi.googleStartUrl();
  };

  if (isHydrating) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="text-sm text-gray-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-white text-2xl font-bold">{t("auth.welcomeBack")}</h1>
          <p className="text-gray-400 mt-1 text-sm">{t("auth.signInDesc")}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="space-y-3 mb-5">
            <Button type="button" variant="secondary" className="w-full" size="lg" onClick={startGoogleAuth}>
              {t("auth.continueWithGoogle")}
            </Button>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-gray-400">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span>{t("auth.orContinueWithEmail")}</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {sessionExpired && !banner && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-xl px-4 py-3 flex gap-2">
                <span className="shrink-0">🔒</span>
                <span>{t("auth.sessionExpired")}</span>
              </div>
            )}

            {googlePending && (
              <div className="bg-brand-50 border border-brand-200 text-brand-700 text-sm rounded-xl px-4 py-3">
                {t("auth.googleCompleting")}
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
