import { getDayBounds, tzFromRequest } from "../utils/dayBounds.js";

const UTC_MIDDAY = "T12:00:00.000Z";

export function getTodayWeightDateStr(
  headers: Record<string, string | string[] | undefined>,
): string {
  return getDayBounds(tzFromRequest(headers)).dateStr;
}

export function normalizeWeightDateInput(
  input: unknown,
  fallbackDateStr: string,
): { dateStr: string; date: Date } {
  const raw = typeof input === "string" ? input.trim() : "";

  if (!raw) {
    return {
      dateStr: fallbackDateStr,
      date: new Date(`${fallbackDateStr}${UTC_MIDDAY}`),
    };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { dateStr: raw, date: new Date(`${raw}${UTC_MIDDAY}`) };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return {
      dateStr: fallbackDateStr,
      date: new Date(`${fallbackDateStr}${UTC_MIDDAY}`),
    };
  }

  return {
    dateStr: parsed.toISOString().split("T")[0],
    date: parsed,
  };
}

export function dayRangeFromDateStr(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00.000Z`),
    end: new Date(`${dateStr}T23:59:59.999Z`),
  };
}

export async function findWeightLogForDay(
  db: any,
  userId: number,
  dateStr: string,
  excludeId?: number,
) {
  const { start, end } = dayRangeFromDateStr(dateStr);
  return db.weightLog.findFirst({
    where: {
      userId,
      date: { gte: start, lte: end },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
}

export async function syncLatestWeight(db: any, userId: number): Promise<number | null> {
  const latest = await db.weightLog.findFirst({
    where: { userId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  const weight = latest?.weight ?? null;
  await db.user.update({
    where: { id: userId },
    data: { weight },
  });

  return weight;
}

export async function upsertWeightLogForDay(
  db: any,
  userId: number,
  dateStr: string,
  data: { weight: number; notes?: string | null; date?: Date },
) {
  const existing = await findWeightLogForDay(db, userId, dateStr);
  const payload: Record<string, any> = {
    weight: Number(data.weight),
    date: data.date ?? new Date(`${dateStr}${UTC_MIDDAY}`),
  };

  if (data.notes !== undefined) {
    payload.notes = data.notes;
  }

  if (existing) {
    return db.weightLog.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return db.weightLog.create({
    data: {
      userId,
      ...payload,
    } as any,
  });
}
