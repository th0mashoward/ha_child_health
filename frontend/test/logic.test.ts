import { describe, expect, it } from "vitest";
import {
  chartModel,
  formatAgo,
  formatDuration,
  illStatus,
  localInputToIso,
  medicineStatus,
  nowForInput,
  parseTemperature,
  recheckAt,
  signature,
  symptomStatus,
  temperatureStatus,
  timeline,
  trackedEntities,
} from "../src/logic";
import { NOW, baseStates, child, entityState, history, iso, makeHass } from "./fixtures";

const MIN = 60_000;
const HOUR = 60 * MIN;

describe("formatDuration", () => {
  it.each([
    [0, "<1m"],
    [20_000, "<1m"],
    [59 * MIN, "59m"],
    [90 * MIN, "1h 30m"],
    [2 * HOUR, "2h"],
    [47 * HOUR, "47h"],
    [48 * HOUR, "2d"],
    [49 * HOUR, "2d 1h"],
  ])("%d ms -> %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it("formats 'ago'", () => {
    expect(formatAgo(10_000)).toBe("just now");
    expect(formatAgo(3 * HOUR)).toBe("3h ago");
  });
});

describe("parseTemperature", () => {
  it.each([
    ["38.4", 38.4],
    ["38,4", 38.4],
    [" 39 ", 39],
    ["about 38.9C", 38.9],
  ])("%s -> %s", (text, expected) => expect(parseTemperature(text)).toBe(expected));

  it.each(["", "abc", "0", "-"])("rejects %j", (text) => expect(parseTemperature(text)).toBeNull());
});

describe("datetime-local helpers", () => {
  it("round-trips local time", () => {
    const value = nowForInput(NOW);
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    const roundTripped = Date.parse(localInputToIso(value) as string);
    expect(Math.abs(roundTripped - NOW)).toBeLessThan(MIN); // minute precision
  });

  it("returns undefined for empty or invalid input", () => {
    expect(localInputToIso("")).toBeUndefined();
    expect(localInputToIso("nope")).toBeUndefined();
  });
});

describe("entity status", () => {
  const hass = makeHass();

  it("symptom still counting down", () => {
    const st = symptomStatus(child.symptoms[0], hass, NOW);
    expect(st.clear).toBe(false);
    expect(st.progress).toBeCloseTo(10 / 48, 2);
    expect((st.clearAt as Date).getTime() - NOW).toBe(38 * HOUR);
  });

  it("symptom with nothing logged is clear", () => {
    const st = symptomStatus(child.symptoms[1], hass, NOW);
    expect(st).toMatchObject({ clear: true, last: null, progress: 1 });
  });

  it("symptom becomes clear once the time has passed", () => {
    expect(symptomStatus(child.symptoms[0], hass, NOW + 39 * HOUR).clear).toBe(true);
  });

  it("medicine allowed only after the gap", () => {
    expect(medicineStatus(child.medicines[0], hass, NOW).allowed).toBe(false);
    expect(medicineStatus(child.medicines[0], hass, NOW + 5 * HOUR).allowed).toBe(true);
  });

  it("temperature and recheck", () => {
    expect(temperatureStatus(child, hass)).toMatchObject({ value: 38.6, fever: true });
    expect((recheckAt(child, hass) as Date).getTime()).toBe(NOW + 90 * MIN);
  });

  it("unknown temperature and recheck are null", () => {
    const states = baseStates();
    states["sensor.alice_last_temperature"] = entityState("sensor.alice_last_temperature", "unknown");
    states["sensor.alice_recheck_temperature_at"] = entityState("sensor.alice_recheck_temperature_at", "unknown");
    const h = makeHass({}, states);
    expect(temperatureStatus(child, h)).toBeNull();
    expect(recheckAt(child, h)).toBeNull();
  });

  it("ill status reads the episode attributes", () => {
    const states = baseStates();
    states["binary_sensor.alice_currently_ill"] = entityState("binary_sensor.alice_currently_ill", "on", {
      illness: "Chickenpox",
      since: iso(-HOUR),
    });
    expect(illStatus(child, makeHass({}, states))).toMatchObject({ ill: true, illness: "Chickenpox" });
    expect(illStatus(child, hass).ill).toBe(false);
  });

  it("signature changes when an entity is updated", () => {
    const ids = trackedEntities(child);
    const before = signature(hass, ids);
    expect(signature(hass, ids)).toBe(before);
    const states = baseStates();
    states["sensor.alice_last_temperature"] = {
      ...states["sensor.alice_last_temperature"],
      last_updated: iso(0),
    };
    expect(signature(makeHass({}, states), ids)).not.toBe(before);
  });
});

describe("chartModel", () => {
  it("is empty without readings in the window", () => {
    expect(chartModel([], 38, NOW, 3).empty).toBe(true);
    expect(chartModel([{ at: iso(-10 * 24 * HOUR), value: 38 }], 38, NOW, 3).empty).toBe(true);
  });

  it("a single reading has a point but no line", () => {
    const m = chartModel([{ at: iso(-HOUR), value: 38.5 }], 38, NOW, 3);
    expect(m.empty).toBe(false);
    expect(m.points).toHaveLength(1);
    expect(m.path).toBe("");
  });

  it("sorts readings, flags fevers and puts hotter readings higher", () => {
    const m = chartModel(history.temperatures.slice().reverse(), 38, NOW, 3);
    expect(m.points.map((p) => p.value)).toEqual([37.2, 38.6]);
    expect(m.points.map((p) => p.fever)).toEqual([false, true]);
    expect(m.points[1].y).toBeLessThan(m.points[0].y); // smaller y = higher on screen
    expect(m.points[1].x).toBeGreaterThan(m.points[0].x);
    expect(m.path.startsWith("M")).toBe(true);
    expect(m.thresholdY).toBeGreaterThan(m.points[1].y);
    expect(m.thresholdY).toBeLessThan(m.points[0].y);
  });

  it("keeps points inside the drawing area", () => {
    const m = chartModel(
      [
        { at: iso(-2 * HOUR), value: 41.5 },
        { at: iso(-HOUR), value: 35.2 },
      ],
      38,
      NOW,
      1,
    );
    for (const p of m.points) {
      expect(p.y).toBeGreaterThanOrEqual(10);
      expect(p.y).toBeLessThanOrEqual(140 - 22);
      expect(p.x).toBeLessThanOrEqual(320 - 10);
    }
  });

  it("handles Fahrenheit thresholds", () => {
    const m = chartModel([{ at: iso(-HOUR), value: 101.5 }], 100.4, NOW, 3);
    expect(m.empty).toBe(false);
    expect(m.yTicks.length).toBeGreaterThan(1);
  });
});

describe("timeline", () => {
  it("merges records newest first with titles and fever flags", () => {
    const items = timeline(history, child);
    expect(items.map((i) => i.id)).toEqual(["t2", "d1", "s1", "t1"]);
    expect(items[0]).toMatchObject({ title: "38.6°C", fever: true, detail: "after nap", kind: "temperature" });
    expect(items[1]).toMatchObject({ title: "Medicine A given", detail: "by Parent", kind: "dose" });
    expect(items[3].fever).toBe(false);
  });

  it("includes episodes", () => {
    const items = timeline(
      { ...history, episodes: [{ id: "e1", illness: "Chickenpox", start: iso(-2 * HOUR), end: null, notes: null }] },
      child,
    );
    expect(items.find((i) => i.id === "e1")).toMatchObject({ title: "Illness: Chickenpox", detail: "ongoing" });
  });
});
