/** Minimal Home Assistant types: just what the card uses. */

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface Hass {
  states: Record<string, HassEntity>;
  locale?: { language?: string };
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
}

export interface SymptomInfo {
  key: string;
  name: string;
  clear_hours: number;
  last: string | null;
  clear_at: string | null;
  clear: string | null;
}

export interface MedicineInfo {
  key: string;
  name: string;
  interval_hours: number;
  last: string | null;
  next: string | null;
  allowed: string | null;
}

/** What the `child_health/children` websocket command returns for one child. */
export interface ChildInfo {
  entry_id: string;
  name: string;
  unit: "celsius" | "fahrenheit";
  unit_symbol: string;
  fever_threshold: number;
  recheck_minutes: number;
  symptoms: SymptomInfo[];
  medicines: MedicineInfo[];
  entities: {
    last_temperature: string | null;
    recheck_at: string | null;
    fever: string | null;
    ill: string | null;
  };
}

export interface SymptomRecord {
  id: string;
  symptom: string;
  name: string;
  at: string;
  note: string | null;
}

export interface TemperatureRecord {
  id: string;
  value: number;
  at: string;
  note: string | null;
}

export interface DoseRecord {
  id: string;
  medicine: string;
  name: string;
  at: string;
  given_by: string | null;
  note: string | null;
}

export interface EpisodeRecord {
  id: string;
  illness: string | null;
  start: string;
  end: string | null;
  notes: string | null;
}

export interface History {
  symptoms: SymptomRecord[];
  temperatures: TemperatureRecord[];
  doses: DoseRecord[];
  episodes: EpisodeRecord[];
}

export interface CardConfig {
  type: string;
  entry_id?: string;
  child?: string;
  title?: string;
  days?: number;
  show_chart?: boolean;
  show_timeline?: boolean;
}

export type RecordKind = "symptom" | "temperature" | "dose" | "episode";
