import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../../api";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useTranslation, t as tGlobal } from "../../i18n";

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
  if (!err.response) {
    return {
      banner: tGlobal("auth.serverUnavailable"),
      fields: {},
    };
  }

  const data = err.response.data ?? {};

  if (data.details && Array.isArray(data.details)) {
    const fields: Record<string, string> = {};
    for (const d of data.details) {
      if (d.field) fields[d.field] = d.message;
    }
    const banner = data.details.length > 0 ? data.details[0].message : tGlobal("common.error");
    return { banner, fields };
  }

  return { banner: data.error || `Server error (${err.response.status})`, fields: {} };
}

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();
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

      for (const [field, message] of Object.entries(fields)) {
        if (["email", "username", "password", "confirmPassword"].includes(field)) {
          setError(field as keyof RegisterForm, { message });
        }
      }
    }
  };

  const fieldError = (name: keyof RegisterForm) =>
    errors[name]?.message || apiFields[name];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">F</span>
          </div>
          <h1 className="text-white text-2xl font-bold">{t("auth.createAccount")}</h1>
          <p className="text-gray-400 mt-1 text-sm">{t("auth.createAccountDesc")}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {banner && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{banner}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input label={t("auth.firstName")} placeholder="Alex"  {...register("firstName")} />
              <Input label={t("auth.lastName")}  placeholder="Smith" {...register("lastName")}  />
            </div>

            <Input
              label={t("auth.username")}
              placeholder="alexsmith"
              {...register("username", {
                required: t("auth.usernameRequired"),
                minLength: { value: 3, message: t("auth.usernameLength") },
                pattern: {
                  value: /^[a-zA-Z0-9_]+$/,
                  message: t("auth.usernameChars"),
                },
              })}
              error={fieldError("username")}
            />

            <Input
              label={t("auth.email")}
              type="email"
              placeholder="you@example.com"
              {...register("email", {
                required: t("auth.emailRequired"),
                pattern: { value: /\S+@\S+\.\S+/, message: t("auth.validEmail") },
              })}
              error={fieldError("email")}
            />

            <Input
              label={t("auth.password")}
              type="password"
              placeholder="••••••••"
              hint={t("auth.passwordRequirements")}
              {...register("password", {
                required: t("auth.passwordRequired"),
                minLength: { value: 8, message: t("auth.passwordMinLength") },
              })}
              error={fieldError("password")}
            />

            <Input
              label={t("auth.confirmPassword")}
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword", {
                required: t("auth.confirmPasswordRequired"),
                validate: (val) => val === password || t("auth.passwordsDoNotMatch"),
              })}
              error={fieldError("confirmPassword")}
            />

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              {t("auth.createAccount")}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {t("auth.haveAccount")}{" "}
            <Link to="/login" className="text-brand-600 font-medium hover:text-brand-700">
              {t("auth.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
