import { vi } from "vitest";
import type { ChildInfo, Hass, HassEntity, History } from "../src/types";

export const NOW = Date.parse("2026-11-18T12:00:00Z");
const MIN = 60_000;
const HOUR = 60 * MIN;

export const iso = (offsetMs: number): string => new Date(NOW + offsetMs).toISOString();

export function entityState(entity_id: string, state: string, attributes: Record<string, unknown> = {}): HassEntity {
  return { entity_id, state, attributes, last_changed: iso(-HOUR), last_updated: iso(-HOUR) };
}

export const child: ChildInfo = {
  entry_id: "abc123",
  name: "Alice",
  unit: "celsius",
  unit_symbol: "°C",
  fever_threshold: 38,
  recheck_minutes: 120,
  symptoms: [
    {
      key: "vomiting",
      name: "Vomiting",
      clear_hours: 48,
      last: "sensor.alice_vomiting_last_occurred",
      clear_at: "sensor.alice_vomiting_all_clear_at",
      clear: "binary_sensor.alice_vomiting_all_clear",
    },
    {
      key: "diarrhoea",
      name: "Diarrhoea",
      clear_hours: 48,
      last: "sensor.alice_diarrhoea_last_occurred",
      clear_at: "sensor.alice_diarrhoea_all_clear_at",
      clear: "binary_sensor.alice_diarrhoea_all_clear",
    },
  ],
  medicines: [
    {
      key: "medicine_a",
      name: "Medicine A",
      interval_hours: 6,
      last: "sensor.alice_medicine_a_last_dose",
      next: "sensor.alice_medicine_a_next_dose_allowed",
      allowed: "binary_sensor.alice_medicine_a_dose_allowed",
    },
  ],
  entities: {
    last_temperature: "sensor.alice_last_temperature",
    recheck_at: "sensor.alice_recheck_temperature_at",
    fever: "binary_sensor.alice_fever",
    ill: "binary_sensor.alice_currently_ill",
  },
};

/** Vomited 10h ago (so clear in 38h); medicine given 1h ago (next dose in 5h); fever 30 min ago. */
export function baseStates(): Record<string, HassEntity> {
  const states = [
    entityState("sensor.alice_vomiting_last_occurred", iso(-10 * HOUR)),
    entityState("sensor.alice_vomiting_all_clear_at", iso(38 * HOUR)),
    entityState("binary_sensor.alice_vomiting_all_clear", "off"),
    entityState("sensor.alice_diarrhoea_last_occurred", "unknown"),
    entityState("sensor.alice_diarrhoea_all_clear_at", "unknown"),
    entityState("binary_sensor.alice_diarrhoea_all_clear", "on"),
    entityState("sensor.alice_medicine_a_last_dose", iso(-HOUR)),
    entityState("sensor.alice_medicine_a_next_dose_allowed", iso(5 * HOUR)),
    entityState("binary_sensor.alice_medicine_a_dose_allowed", "off"),
    entityState("sensor.alice_last_temperature", "38.6", { recorded_at: iso(-30 * MIN), fever_threshold: 38 }),
    entityState("sensor.alice_recheck_temperature_at", iso(90 * MIN)),
    entityState("binary_sensor.alice_fever", "on"),
    entityState("binary_sensor.alice_currently_ill", "off"),
  ];
  return Object.fromEntries(states.map((s) => [s.entity_id, s]));
}

export const history: History = {
  symptoms: [{ id: "s1", symptom: "vomiting", name: "Vomiting", at: iso(-10 * HOUR), note: null }],
  temperatures: [
    { id: "t1", value: 37.2, at: iso(-20 * HOUR), note: null },
    { id: "t2", value: 38.6, at: iso(-30 * MIN), note: "after nap" },
  ],
  doses: [{ id: "d1", medicine: "medicine_a", name: "Medicine A", at: iso(-HOUR), given_by: "Parent", note: null }],
  episodes: [],
};

type Handler = (msg: Record<string, unknown>) => unknown;

export function makeHass(handlers: Record<string, Handler> = {}, states = baseStates()) {
  const hass = {
    states,
    locale: { language: "en-GB" },
    callWS: vi.fn(async (msg: Record<string, unknown>) => {
      if (msg.type === "child_health/children") return [child];
      if (msg.type === "call_service") {
        const handler = handlers[msg.service as string];
        if (handler) return handler(msg);
        if (msg.service === "get_history") return { response: history };
        return { response: {} };
      }
      throw new Error(`unexpected message ${String(msg.type)}`);
    }),
  };
  return hass as unknown as Hass & { callWS: ReturnType<typeof vi.fn> };
}

export function serviceCalls(hass: { callWS: ReturnType<typeof vi.fn> }, service: string) {
  return hass.callWS.mock.calls
    .map(([msg]) => msg as Record<string, unknown>)
    .filter((msg) => msg.type === "call_service" && msg.service === service);
}
