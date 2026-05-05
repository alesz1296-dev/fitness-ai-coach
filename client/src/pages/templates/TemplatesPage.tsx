import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { templatesApi, workoutsApi } from "../../api";
import type { WorkoutTemplate } from "../../types";
import { useAuthStore } from "../../store/authStore";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { useTranslation } from "../../i18n";
import { WorkoutPrepPanel } from "../../lib/workoutPrep";
import {
  getTemplateDisplayTitle,
  translateMuscleGroupLabel,
  translateObjectiveLabel,
  translateSplitLabel,
} from "../../lib/workoutLabels";

const OBJECTIVE_COLORS: Record<string, string> = {
  hypertrophy: "bg-blue-100 text-blue-700",
  strength: "bg-purple-100 text-purple-700",
  fat_loss: "bg-orange-100 text-orange-700",
  endurance: "bg-green-100 text-green-700",
  general: "bg-gray-100 text-gray-600",
};

const SPLIT_ICONS: Record<string, string> = {
  PPL: "🔄",
  Upper_Lower: "↕️",
  Bro_Split: "💪",
  Full_Body: "🏋️",
  Custom: "⚙️",
};

function TemplateCard({ template, onStart, onView }: {
  template: WorkoutTemplate;
  onStart: (t: WorkoutTemplate) => void;
  onView: (t: WorkoutTemplate) => void;
}) {
  const { t } = useTranslation();
  const title = getTemplateDisplayTitle(template, t);
  const muscleGroups = Array.isArray(template.muscleGroups) ? template.muscleGroups : [];
  const prepSource = {
    splitType: template.splitType,
    objective: template.objective,
    muscleGroups,
    dayLabel: template.dayLabel,
    trainingType: template.name,
    exerciseNames: template.exercises.map((ex) => ex.exerciseName),
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{SPLIT_ICONS[template.splitType] ?? "🏋️"}</span>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{title}</h3>
          </div>
          <p className="text-xs text-gray-500">
            {translateSplitLabel(template.splitType, t)} · {template.frequency}×/{t("templates.weekShort")}
          </p>
        </div>
        {template.isSystem && <Badge variant="info">{t("templates.recommended")}</Badge>}
        {template.aiGenerated && <Badge variant="success">AI</Badge>}
      </div>

      {template.description && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">{template.description}</p>
      )}

      <div className="flex gap-1.5 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${OBJECTIVE_COLORS[template.objective] ?? "bg-gray-100 text-gray-600"}`}>
          {translateObjectiveLabel(template.objective, t)}
        </span>
        {muscleGroups.slice(0, 3).map((m) => (
          <span key={m} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {translateMuscleGroupLabel(m, t)}
          </span>
        ))}
      </div>

      <div className="mb-3">
        <WorkoutPrepPanel source={prepSource} compact />
      </div>

      {template.exercises.length > 0 && (
        <div className="text-xs text-gray-400 mb-3 space-y-0.5">
          {template.exercises.slice(0, 4).map((e) => (
            <p key={e.id}>· {e.exerciseName} <span className="text-gray-300">({e.sets}×{e.reps})</span></p>
          ))}
          {template.exercises.length > 4 && <p className="text-gray-300">+{template.exercises.length - 4} more exercises</p>}
        </div>
      )}

      <div className="mt-auto flex gap-2 pt-3 border-t border-gray-100">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => onView(template)}>{t("templates.viewTemplate")}</Button>
        <Button size="sm" className="flex-1" onClick={() => onStart(template)}>{t("templates.startWorkout")}</Button>
      </div>
    </Card>
  );
}

function TemplateDetail({ template, onStart, onClose }: {
  template: WorkoutTemplate;
  onStart: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const title = getTemplateDisplayTitle(template, t);
  const prepSource = {
    splitType: template.splitType,
    objective: template.objective,
    muscleGroups: Array.isArray(template.muscleGroups) ? template.muscleGroups : [],
    dayLabel: template.dayLabel,
    trainingType: template.name,
    exerciseNames: template.exercises.map((ex) => ex.exerciseName),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{SPLIT_ICONS[template.splitType] ?? "🏋️"}</span>
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">
            {translateSplitLabel(template.splitType, t)} · {template.frequency}×/{t("templates.weekShort")} · {translateObjectiveLabel(template.objective, t)}
          </p>
        </div>
      </div>
      {template.description && <p className="text-sm text-gray-600 dark:text-gray-300">{template.description}</p>}

      <WorkoutPrepPanel source={prepSource} />

      <div className="space-y-2">
        {template.exercises.map((ex, i) => (
          <div key={ex.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{ex.exerciseName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{ex.sets} sets × {ex.reps} reps{ex.restSeconds ? ` · ${ex.restSeconds}s rest` : ""}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Button variant="secondary" className="flex-1" onClick={onClose}>{t("workouts.closeBtn")}</Button>
        <Button className="flex-1" onClick={onStart}>{t("templates.startWorkout")}</Button>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const trainingDays = user?.trainingDaysPerWeek ?? 4;
  const [tab, setTab] = useState<"recommended" | "mine">("recommended");
  const [grouped, setGrouped] = useState<Record<string, WorkoutTemplate[]>>({});
  const [mine, setMine] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [detail, setDetail] = useState<WorkoutTemplate | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, mineRes] = await Promise.all([
        templatesApi.getRecommended(),
        templatesApi.getAll(),
      ]);
      setGrouped(recRes.data.grouped);
      setMine(mineRes.data.templates.filter((tpl) => !tpl.isSystem));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startFromTemplate = async (template: WorkoutTemplate) => {
    setStarting(template.id);
    try {
      await workoutsApi.startFromTemplate(template.id);
      navigate("/workouts");
    } catch {
      alert(t("templates.failedToStartWorkout"));
    } finally {
      setStarting(null);
    }
  };

  const seedTemplates = async () => {
    setSeeding(true);
    try {
      await templatesApi.seed();
      await load();
    } finally {
      setSeeding(false);
    }
  };

  const filteredGrouped = Object.fromEntries(
    Object.entries(grouped).map(([groupKey, templates]) => {
      const matched = templates.filter((tpl) => tpl.frequency === trainingDays);
      return [groupKey, matched.length > 0 ? matched : templates];
    })
  );
  const hasAnyMatch = Object.values(grouped).flat().some((tpl) => tpl.frequency === trainingDays);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("templates.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t("templates.preBuiltSplits")}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["recommended", "mine"] as const).map((subTabKey) => (
          <button
            key={subTabKey}
            onClick={() => setTab(subTabKey)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === subTabKey ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            {subTabKey === "recommended" ? t("templates.recommended") : t("templates.myTemplates")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : tab === "recommended" ? (
        <div className="space-y-8">
          {Object.keys(grouped).length === 0 ? (
            <Card className="text-center py-14">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="font-semibold text-gray-800 mb-2">{t("templates.recommendedTemplatesEmpty")}</h3>
              <p className="text-sm text-gray-400 mb-4">{t("templates.seedRecommendedDesc")}</p>
              <Button loading={seeding} onClick={seedTemplates}>{t("templates.seedRecommendedTemplates")}</Button>
            </Card>
          ) : (
            <div className="space-y-8">
              {hasAnyMatch && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t("templates.showingPlansForDays", { days: trainingDays })}
                </p>
              )}
              {Object.entries(filteredGrouped).map(([groupKey, templates]) => (
                <div key={groupKey}>
                  <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">{translateSplitLabel(groupKey, t)}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        onStart={() => startFromTemplate(tpl)}
                        onView={() => setDetail(tpl)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {mine.length === 0 ? (
            <Card className="text-center py-14">
              <div className="text-5xl mb-4">⚙️</div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{t("templates.personalTemplatesEmpty")}</h3>
              <p className="text-sm text-gray-400 dark:text-gray-500">{t("templates.saveWorkoutAsTemplateHint")}</p>
              <Button variant="secondary" onClick={() => navigate("/chat?agent=coach")}>{t("templates.askAiCoach")}</Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mine.map((tpl) => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onStart={() => startFromTemplate(tpl)}
                  onView={() => setDetail(tpl)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? getTemplateDisplayTitle(detail, t) : undefined} size="md">
        {detail && (
          <TemplateDetail
            template={detail}
            onStart={() => { setDetail(null); startFromTemplate(detail); }}
            onClose={() => setDetail(null)}
          />
        )}
      </Modal>
    </div>
  );
}
