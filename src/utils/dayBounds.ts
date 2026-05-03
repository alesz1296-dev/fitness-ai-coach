/**
 * getDayBounds — timezone-aware day boundary with configurable rollover hour.
 *
 * "Today" for a user runs from 00:00 local time to 23:59:59.
 * Entries logged after midnight belong to the current day.
 *
 * @param tz          IANA timezone string (e.g. "America/New_York"). Falls back to UTC.
 * @param rolloverHour Hour at which the new day starts (default 0).
 * @returns { start, end, dateStr } — UTC Date range + "YYYY-MM-DD" effective date label.
 */
export function getDayBounds(
  tz: string = "UTC",
  rolloverHour = 0,
): { start: Date; end: Date; dateStr: string } {
  const now = new Date();

  // 1. Get local date + hour in user's timezone
  let localDateStr: string;
  let localHour: number;
  try {
    localDateStr = now.toLocaleDateString("en-CA", { timeZone: tz }); // "YYYY-MM-DD"
    const h = now.toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
    });
    localHour = parseInt(h === "24" ? "0" : h, 10);
    if (isNaN(localHour)) localHour = 0;
  } catch {
    // Invalid timezone — fall back to UTC
    localDateStr = now.toISOString().split("T")[0];
    localHour    = now.getUTCHours();
    tz           = "UTC";
  }

  // 2. If local time is before rollover, effective date is yesterday
  let [year, month, day] = localDateStr.split("-").map(Number);
  if (localHour < rolloverHour) {
    const prev = new Date(Date.UTC(year, month - 1, day - 1));
    year  = prev.getUTCFullYear();
    month = prev.getUTCMonth() + 1;
    day   = prev.getUTCDate();
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const effectiveDateStr = `${year}-${pad(month)}-${pad(day)}`;

  // 3. Compute the UTC offset for this timezone using noon on effectiveDate.
  //    Using noon avoids ambiguity during DST transitions (which happen at ~2am).
  const noonUTC       = new Date(`${effectiveDateStr}T12:00:00.000Z`);
  const noonLocalStr  = noonUTC.toLocaleString("en-US", { timeZone: tz });
  const noonLocalDate = new Date(noonLocalStr); // parsed as UTC on Railway (server is UTC)
  const tzOffsetMs    = noonUTC.getTime() - noonLocalDate.getTime();

  // 4. Start = rolloverHour:00:00 on effectiveDate in user's timezone → converted to UTC
  const startWall = new Date(`${effectiveDateStr}T${pad(rolloverHour)}:00:00.000`);
  const start     = new Date(startWall.getTime() + tzOffsetMs);

  // 5. End = rolloverHour:00:00 on (effectiveDate + 1 day) − 1 ms
  const next        = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDateStr = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  const endWall     = new Date(`${nextDateStr}T${pad(rolloverHour)}:00:00.000`);
  const end         = new Date(endWall.getTime() + tzOffsetMs - 1);

  return { start, end, dateStr: effectiveDateStr };
}

/**
 * Read the user's timezone from an Express request's X-Timezone header.
 * Falls back to "UTC" if missing or unrecognisable.
 */
export function tzFromRequest(headers: Record<string, string | string[] | undefined>): string {
  const raw = headers["x-timezone"];
  const tz  = Array.isArray(raw) ? raw[0] : raw ?? "UTC";
  // Quick sanity-check: try formatting a date in this tz
  try {
    new Date().toLocaleDateString("en-CA", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}
