import { useTranslation } from "../../i18n";

type StatusTone = "pending" | "accepted" | "rejected" | "needs_attention" | "overdue";
type OwnershipTone = "coach" | "user" | "ai";

export function StatusChip({
  status,
  label,
  className = "",
}: {
  status: StatusTone;
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();

  const map: Record<StatusTone, { text: string; classes: string }> = {
    pending: {
      text: t("coach.statusPending"),
      classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
    },
    accepted: {
      text: t("coach.statusAccepted"),
      classes: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200",
    },
    rejected: {
      text: t("coach.statusRejected"),
      classes: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200",
    },
    needs_attention: {
      text: t("coach.statusNeedsAttention"),
      classes: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
    },
    overdue: {
      text: t("coach.statusOverdue"),
      classes: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200",
    },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${map[status].classes} ${className}`}
    >
      {label ?? map[status].text}
    </span>
  );
}

export function OwnershipChip({
  owner,
  className = "",
}: {
  owner: OwnershipTone;
  className?: string;
}) {
  const { t } = useTranslation();

  const map: Record<OwnershipTone, { text: string; classes: string }> = {
    coach: {
      text: t("coach.ownershipCoachPlan"),
      classes: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
    },
    user: {
      text: t("coach.ownershipYourPlan"),
      classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    },
    ai: {
      text: t("coach.ownershipAiSuggestion"),
      classes: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
    },
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${map[owner].classes} ${className}`}
    >
      {map[owner].text}
    </span>
  );
}

export function VisibilityChip({
  state,
  audienceLabel,
  className = "",
}: {
  state: "visible" | "private" | "pending_review";
  audienceLabel?: string;
  className?: string;
}) {
  const { t } = useTranslation();

  const map = {
    visible: {
      text: t("coach.visibilityVisibleToCoach"),
      classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    },
    private: {
      text: t("coach.visibilityPrivate"),
      classes: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    },
    pending_review: {
      text: t("coach.visibilityPendingReview"),
      classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
    },
  }[state];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${map.classes} ${className}`}
    >
      {audienceLabel ? <span>{audienceLabel}</span> : null}
      <span>{map.text}</span>
    </span>
  );
}
