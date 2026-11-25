/** Pure helpers: durations, entity status, the temperature chart and the timeline. */

import type { ChildInfo, Hass, HassEntity, History, MedicineInfo, RecordKind, SymptomInfo } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// ---------- formatting ----------

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / MINUTE));
  if (totalMin < 1) return "<1m";
  if (totalMin < 60) return `${totalMin}m`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 48) return mins ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days}d ${rest}h` : `${days}d`;
}

export function formatAgo(ms: number): string {
  return ms < MINUTE ? "just now" : `${formatDuration(ms)} ago`;
}

/** "14:05" for today, "Tue 14:05" for another day. */
export function formatWhen(at: number, now: number, locale?: string): string {
  const date = new Date(at);
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const today = new Date(now);
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  return sameDay ? time : `${date.toLocaleDateString(locale, { weekday: "short" })} ${time}`;
}

// ---------- input ----------

/** "38.4" or "38,4" -> 38.4; anything unreadable -> null. */
export function parseTemperature(text: string): number | null {
  const match = text.replace(",", ".").match(/[0-9]+(?:\.[0-9]+)?/);
  if (!match) return null;
  const value = parseFloat(match[0]);
  return value > 0 ? value : null;
}

/** Value of a <input type="datetime-local"> (browser-local time) -> unambiguous ISO string. */
export function localInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/** Current local time in the format <input type="datetime-local"> expects. */
export function nowForInput(now: number): string {
  const date = new Date(now - new Date(now).getTimezoneOffset() * MINUTE);
  return date.toISOString().slice(0, 16);
}

// ---------- entity status ----------

export function parseTimestamp(state: HassEntity | undefined): Date | null {
  if (!state || state.state === "unknown" || state.state === "unavailable") return null;
  const date = new Date(state.state);
  return Number.isNaN(date.getTime()) ? null : date;
}

function entity(hass: Hass, id: string | null): HassEntity | undefined {
  return id ? hass.states[id] : undefined;
}

export interface SymptomStatus {
  last: Date | null;
  clearAt: Date | null;
  clear: boolean;
  /** 0..1 of the way to all clear (1 when clear). */
  progress: number;
}

export function symptomStatus(sym: SymptomInfo, hass: Hass, now: number): SymptomStatus {
  const last = parseTimestamp(entity(hass, sym.last));
  const clearAt = parseTimestamp(entity(hass, sym.clear_at));
  if (!last || !clearAt) return { last, clearAt, clear: true, progress: 1 };
  const clear = now >= clearAt.getTime();
  const span = clearAt.getTime() - last.getTime();
  const progress = clear || span <= 0 ? 1 : Math.min(1, Math.max(0, (now - last.getTime()) / span));
  return { last, clearAt, clear, progress };
}

export interface MedicineStatus {
  last: Date | null;
  next: Date | null;
  allowed: boolean;
}

export function medicineStatus(med: MedicineInfo, hass: Hass, now: number): MedicineStatus {
  const last = parseTimestamp(entity(hass, med.last));
  const next = parseTimestamp(entity(hass, med.next));
  return { last, next, allowed: !next || now >= next.getTime() };
}

export interface TemperatureStatus {
  value: number;
  recordedAt: Date | null;
  fever: boolean;
}

export function temperatureStatus(child: ChildInfo, hass: Hass): TemperatureStatus | null {
  const state = entity(hass, child.entities.last_temperature);
  if (!state || state.state === "unknown" || state.state === "unavailable") return null;
  const value = parseFloat(state.state);
  if (Number.isNaN(value)) return null;
  const recorded = state.attributes["recorded_at"];
  const recordedAt = typeof recorded === "string" ? new Date(recorded) : null;
  return { value, recordedAt, fever: value >= child.fever_threshold };
}

export function recheckAt(child: ChildInfo, hass: Hass): Date | null {
  return parseTimestamp(entity(hass, child.entities.recheck_at));
}

export interface IllStatus {
  ill: boolean;
  illness: string | null;
  since: Date | null;
}

export function illStatus(child: ChildInfo, hass: Hass): IllStatus {
  const state = entity(hass, child.entities.ill);
  if (!state || state.state !== "on") return { ill: false, illness: null, since: null };
  const illness = state.attributes["illness"];
  const since = state.attributes["since"];
  return {
    ill: true,
    illness: typeof illness === "string" && illness ? illness : null,
    since: typeof since === "string" ? new Date(since) : null,
  };
}

/** Changes whenever any of these entities changes: used to know when to refetch history. */
export function signature(hass: Hass, entityIds: (string | null)[]): string {
  return entityIds
    .filter((id): id is string => !!id)
    .map((id) => {
      const state = hass.states[id];
      return state ? `${id}|${state.state}|${state.last_updated}` : `${id}|missing`;
    })
    .join(";");
}

export function trackedEntities(child: ChildInfo): (string | null)[] {
  return [
    ...Object.values(child.entities),
    ...child.symptoms.flatMap((s) => [s.last, s.clear_at, s.clear]),
    ...child.medicines.flatMap((m) => [m.last, m.next, m.allowed]),
  ];
}

// ---------- chart ----------

export interface ChartPoint {
  x: number;
  y: number;
  value: number;
  at: number;
  fever: boolean;
}

export interface ChartModel {
  width: number;
  height: number;
  empty: boolean;
  points: ChartPoint[];
  path: string;
  thresholdY: number;
  yTicks: { y: number; label: string }[];
  xTicks: { x: number; label: string }[];
}

export const CHART_PAD = { left: 34, right: 10, top: 10, bottom: 22 };
const PAD = CHART_PAD;

export function chartModel(
  readings: { at: string; value: number }[],
  threshold: number,
  now: number,
  days: number,
  width = 320,
  height = 140,
  locale?: string,
): ChartModel {
  const start = now - days * DAY;
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const data = readings
    .map((r) => ({ at: Date.parse(r.at), value: r.value }))
    .filter((r) => !Number.isNaN(r.at) && r.at >= start && r.at <= now + MINUTE)
    .sort((a, b) => a.at - b.at);

  const base = { width, height, yTicks: [], xTicks: [], thresholdY: 0 };
  if (data.length === 0) return { ...base, empty: true, points: [], path: "" };

  const fahrenheit = threshold > 60;
  const low = Math.min(threshold - (fahrenheit ? 2.7 : 1.5), ...data.map((d) => d.value)) - 0.3;
  const high = Math.max(threshold + (fahrenheit ? 1.8 : 1), ...data.map((d) => d.value)) + 0.3;
  const min = Math.floor(low * 2) / 2;
  const max = Math.ceil(high * 2) / 2;

  const xFor = (t: number) => PAD.left + Math.min(1, Math.max(0, (t - start) / (now - start))) * innerW;
  const yFor = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;

  const points = data.map((d) => ({
    x: xFor(d.at),
    y: yFor(d.value),
    value: d.value,
    at: d.at,
    fever: d.value >= threshold,
  }));
  const path =
    points.length > 1 ? points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") : "";

  const step = max - min <= 3 ? 0.5 : max - min <= 8 ? 1 : 2;
  const yTicks: { y: number; label: string }[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) {
    yTicks.push({ y: yFor(v), label: Number.isInteger(v) ? String(v) : v.toFixed(1) });
  }

  const xTicks: { x: number; label: string }[] = [];
  const midnight = new Date(start);
  midnight.setHours(24, 0, 0, 0);
  for (let t = midnight.getTime(); t < now; ) {
    xTicks.push({
      x: xFor(t),
      label: new Date(t).toLocaleDateString(locale, days <= 7 ? { weekday: "short" } : { day: "numeric", month: "short" }),
    });
    const next = new Date(t);
    next.setDate(next.getDate() + (days > 7 ? Math.ceil(days / 7) : 1));
    next.setHours(0, 0, 0, 0);
    t = next.getTime();
  }

  return { ...base, empty: false, points, path, thresholdY: yFor(threshold), yTicks, xTicks };
}

// ---------- timeline ----------

export interface TimelineItem {
  id: string;
  kind: RecordKind;
  at: number;
  title: string;
  detail: string;
  fever: boolean;
  icon: string;
}

function join(parts: (string | null | undefined)[]): string {
  return parts.filter((p): p is string => !!p).join(" · ");
}

export function timeline(history: History, child: ChildInfo): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const r of history.symptoms) {
    items.push({ id: r.id, kind: "symptom", at: Date.parse(r.at), title: r.name, detail: join([r.note]), fever: false, icon: "mdi:emoticon-sick-outline" });
  }
  for (const r of history.temperatures) {
    items.push({
      id: r.id,
      kind: "temperature",
      at: Date.parse(r.at),
      title: `${r.value}${child.unit_symbol}`,
      detail: join([r.note]),
      fever: r.value >= child.fever_threshold,
      icon: "mdi:thermometer",
    });
  }
  for (const r of history.doses) {
    items.push({
      id: r.id,
      kind: "dose",
      at: Date.parse(r.at),
      title: `${r.name} given`,
      detail: join([r.given_by ? `by ${r.given_by}` : null, r.note]),
      fever: false,
      icon: "mdi:pill",
    });
  }
  for (const r of history.episodes) {
    items.push({
      id: r.id,
      kind: "episode",
      at: Date.parse(r.start),
      title: `Illness${r.illness ? `: ${r.illness}` : ""}`,
      detail: join([r.end ? "ended" : "ongoing", r.notes]),
      fever: false,
      icon: "mdi:medical-bag",
    });
  }

  return items.filter((i) => !Number.isNaN(i.at)).sort((a, b) => b.at - a.at);
}
