import type { User } from "../../types";
import { useTranslation } from "../../i18n";

interface UserRoleBadgeProps {
  role?: User["role"] | null;
  className?: string;
}

export function UserRoleBadge({ role, className = "" }: UserRoleBadgeProps) {
  const { t } = useTranslation();

  if (role !== "coach") {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 ${className}`}
    >
      {t("coach.verifiedCoach")}
    </span>
  );
}
