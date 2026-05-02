/**
 * Locale-aware date formatting utilities.
 *
 * These replace date-fns `format()` calls that output English month/day names.
 * All functions accept an optional `lang` string (BCP-47, e.g. "en", "es", "fr").
 * When `lang` is omitted the module-level active language is used (kept in sync
 * by calling `setDateFormatLang` from the I18nProvider on language change).
 */

let _lang = "en";

/** Called by the app's I18nProvider whenever the language changes. */
export function setDateFormatLang(lang: string) {
  _lang = lang;
}

/** Current active language (read by helpers below). */
export function getDateFormatLang() {
  return _lang;
}

/** Parse a date value into a Date object (handles string | Date | number). */
function toDate(d: Date | string | number): Date {
  if (d instanceof Date) return d;
  if (typeof d === "number") return new Date(d);
  // ISO strings without time should be parsed as local date, not UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}

/** "Jan 5"  (month: short, day: numeric) */
export function fmtMonthDay(d: Date | string | number, lang?: string): string {
  return new Intl.DateTimeFormat(lang ?? _lang, { month: "short", day: "numeric" }).format(toDate(d));
}

/** "January 5"  (month: long, day: numeric) */
export function fmtLongMonthDay(d: Date | string | number, lang?: string): string {
  return new Intl.DateTimeFormat(lang ?? _lang, { month: "long", day: "numeric" }).format(toDate(d));
}

/** "Jan 5, 2025"  (month: short, day: numeric, year: numeric) */
export function fmtMonthDayYear(d: Date | string | number, lang?: string): string {
  return new Intl.DateTimeFormat(lang ?? _lang, { month: "short", day: "numeric", year: "numeric" }).format(toDate(d));
}

/** "January 2025"  (month: long, year: numeric) */
export function fmtMonthYear(d: Date | string | number, lang?: string): string {
  return new Intl.DateTimeFormat(lang ?? _lang, { month: "long", year: "numeric" }).format(toDate(d));
}

/** "Saturday, January 5"  (weekday: long, month: long, day: numeric) */
export function fmtWeekdayLongDate(d: Date | string | number, lang?: string): string {
  return new Intl.DateTimeFormat(lang ?? _lang, { weekday: "long", month: "long", day: "numeric" }).format(toDate(d));
}

/** "Saturday, January 5, 2025"  (weekday: long, month: long, day: numeric, year: numeric) */
export function fmtWeekdayFullDate(d: Date | string | number, lang?: string): string {
  return new Intl.DateTimeFormat(lang ?? _lang, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(toDate(d));
}

/** "Sat, Jan 5"  (weekday: short, month: short, day: numeric) */
export function fmtWeekdayShortDate(d: Date | string | number, lang?: string): string {
  return new Intl.DateTimeFormat(lang ?? _lang, { weekday: "short", month: "short", day: "numeric" }).format(toDate(d));
}
