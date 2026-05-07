import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { coachApi } from "../../api";
import type { CoachClientLink } from "../../types";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { useTranslation } from "../../i18n";

export default function CoachPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [clients, setClients] = useState<CoachClientLink[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user || !["coach", "admin", "developer"].includes(user.role ?? "user")) {
      navigate("/dashboard", { replace: true });
      return;
    }
    coachApi.getClients()
      .then((res) => setClients(res.data.clients))
      .finally(() => setLoading(false));
  }, [navigate, user]);

  const handleCreateInvite = async () => {
    setCreating(true);
    try {
      const res = await coachApi.createInvite(7);
      setInviteCode(res.data.invite.code);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("coach.title")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("coach.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader title={t("coach.inviteClient")} />
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("coach.inviteClientBody")}
            </p>
            <Button onClick={handleCreateInvite} loading={creating}>
              {t("coach.createInviteCode")}
            </Button>
            {inviteCode && (
              <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 p-3">
                <p className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300 font-semibold">
                  {t("coach.activeCode")}
                </p>
                <p className="text-2xl font-bold text-brand-800 dark:text-brand-200 mt-1">
                  {inviteCode}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title={t("coach.assignedClients")} />
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {t("coach.loadingClients")}
            </div>
          ) : clients.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              {t("coach.noClients")}
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map((link) => (
                <Link
                  key={link.id}
                  to={`/coach/clients/${link.client?.id}`}
                  className="block rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-brand-400 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {link.client?.firstName || link.client?.username} {link.client?.lastName || ""}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {link.client?.email}
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      <p>{t("coach.currentGoal")}: {link.client?.goal || "-"}</p>
                      <p>{link.client?.trainingDaysPerWeek ?? "?"} / 7</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
