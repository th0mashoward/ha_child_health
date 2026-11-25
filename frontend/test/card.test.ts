import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import type { ChildHealthCard } from "../src/child-health-card";
import { NOW, baseStates, child, entityState, iso, makeHass, serviceCalls } from "./fixtures";

const MIN = 60_000;
const HOUR = 60 * MIN;

type Hass = ReturnType<typeof makeHass>;

async function settle(el: ChildHealthCard): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
}

async function mount(hass: Hass, config: Record<string, unknown> = { entry_id: child.entry_id }) {
  const el = document.createElement("child-health-card") as ChildHealthCard;
  el.setConfig({ type: "custom:child-health-card", ...config });
  el.hass = hass;
  document.body.append(el);
  await settle(el);
  return el;
}

const root = (el: ChildHealthCard) => el.shadowRoot as ShadowRoot;
const text = (el: ChildHealthCard) => (root(el).textContent ?? "").replace(/\s+/g, " ");

function button(el: ChildHealthCard, label: string): HTMLButtonElement {
  const buttons = [...root(el).querySelectorAll("button")];
  const label_of = (b: HTMLButtonElement) => (b.textContent ?? "").replace(/\s+/g, " ").trim();
  // prefer an exact label ("Start" vs "Start illness", "Log" vs "Log anyway")
  const found = buttons.find((b) => label_of(b) === label) ?? buttons.find((b) => label_of(b).includes(label));
  if (!found) throw new Error(`no button "${label}" in: ${text(el)}`);
  return found;
}

async function click(el: ChildHealthCard, label: string) {
  button(el, label).click();
  await settle(el);
}

function type(el: ChildHealthCard, selector: string, value: string) {
  const input = root(el).querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event("input"));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("registration", () => {
  it("defines the card and editor and lists the card in the picker", () => {
    expect(customElements.get("child-health-card")).toBeDefined();
    expect(customElements.get("child-health-card-editor")).toBeDefined();
    expect(window.customCards?.some((c) => c.type === "child-health-card")).toBe(true);
  });
});

describe("rendering", () => {
  it("asks for a child when none is configured", async () => {
    const el = await mount(makeHass(), {});
    expect(text(el)).toContain("Choose a child");
  });

  it("shows the child, temperature, recheck and countdowns", async () => {
    const el = await mount(makeHass());
    const t = text(el);
    expect(t).toContain("Alice");
    expect(t).toContain("38.6°C");
    expect(t).toContain("30m ago");
    expect(t).toContain("Recheck in 1h 30m");
    expect(t).toContain("Clear in 38h"); // vomiting
    expect(t).toContain("None logged"); // diarrhoea
    expect(t).toContain("In 5h"); // medicine
    expect(t).toContain("Last 1h ago");
    expect(t).toContain("this card never suggests a dose");
  });

  it("loads the children and the history on connect", async () => {
    const hass = makeHass();
    await mount(hass);
    expect(hass.callWS).toHaveBeenCalledWith({ type: "child_health/children" });
    expect(serviceCalls(hass, "get_history")[0]).toMatchObject({
      domain: "child_health",
      return_response: true,
      service_data: { config_entry: "abc123", days: 3 },
    });
  });

  it("finds a child by name and honours the title and days options", async () => {
    const hass = makeHass();
    const el = await mount(hass, { child: "alice", title: "Little A", days: 7 });
    expect(text(el)).toContain("Little A");
    expect(serviceCalls(hass, "get_history")[0].service_data).toMatchObject({ days: 7 });
  });

  it("shows the temperature chart and recent entries", async () => {
    const el = await mount(makeHass());
    expect(root(el).querySelectorAll("svg.chart circle.pt")).toHaveLength(2);
    expect(root(el).querySelectorAll("svg.chart circle.pt.fever")).toHaveLength(1);
    const t = text(el);
    expect(t).toContain("Medicine A given");
    expect(t).toContain("by Parent");
    expect(t).toContain("after nap");
  });

  it("can hide the chart and the recent entries", async () => {
    const el = await mount(makeHass(), { entry_id: child.entry_id, show_chart: false, show_timeline: false });
    expect(root(el).querySelector("svg.chart")).toBeNull();
    expect(text(el)).not.toContain("Recent");
  });

  it("shows an ill chip while an illness is open", async () => {
    const states = baseStates();
    states["binary_sensor.alice_currently_ill"] = entityState("binary_sensor.alice_currently_ill", "on", {
      illness: "Tummy bug",
      since: iso(-HOUR),
    });
    const el = await mount(makeHass({}, states));
    expect(text(el)).toContain("Ill: Tummy bug");
    expect(button(el, "End illness")).toBeDefined();
  });

  it("shows all clear when the time has passed", async () => {
    const states = baseStates();
    states["sensor.alice_vomiting_all_clear_at"] = entityState("sensor.alice_vomiting_all_clear_at", iso(-HOUR));
    const el = await mount(makeHass({}, states));
    expect(text(el)).toContain("All clear");
    expect(text(el)).not.toContain("Clear in");
  });
});

describe("logging", () => {
  it("logs a symptom with one tap", async () => {
    const hass = makeHass();
    const el = await mount(hass);
    await click(el, "Vomiting");
    const calls = serviceCalls(hass, "log_symptom");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      domain: "child_health",
      return_response: true,
      service_data: { config_entry: "abc123", symptom: "Vomiting" },
    });
    expect(calls[0].service_data).not.toHaveProperty("occurred_at");
    // history is refreshed after logging
    expect(serviceCalls(hass, "get_history").length).toBeGreaterThanOrEqual(2);
  });

  it("logs a temperature typed with a comma", async () => {
    const hass = makeHass();
    const el = await mount(hass);
    await click(el, "Temperature");
    type(el, "input.temp", "38,4");
    await click(el, "Log");
    expect(serviceCalls(hass, "log_temperature")[0].service_data).toMatchObject({
      config_entry: "abc123",
      temperature: 38.4,
    });
    expect(root(el).querySelector("input.temp")).toBeNull(); // panel closed
  });

  it("rejects an unreadable temperature without calling the service", async () => {
    const hass = makeHass();
    const el = await mount(hass);
    await click(el, "Temperature");
    type(el, "input.temp", "warm");
    await click(el, "Log");
    expect(serviceCalls(hass, "log_temperature")).toHaveLength(0);
    expect(text(el)).toContain("Enter a temperature like 38.4");
  });

  it("asks before logging a dose that is too soon, then logs it on confirm", async () => {
    const next = iso(5 * HOUR);
    const hass = makeHass({
      log_dose: (msg) => {
        const data = msg.service_data as Record<string, unknown>;
        return data.override
          ? { response: { logged: true, too_soon: false, medicine: "Medicine A" } }
          : { response: { logged: false, too_soon: true, next_dose_allowed: next } };
      },
    });
    const el = await mount(hass);

    await click(el, "Medicine A");
    let calls = serviceCalls(hass, "log_dose");
    expect(calls[0].service_data).toMatchObject({ medicine: "Medicine A", fail_if_too_soon: false, override: false });
    expect(text(el)).toContain("had Medicine A recently");
    expect(text(el)).toContain("next dose is allowed");

    await click(el, "Log anyway");
    calls = serviceCalls(hass, "log_dose");
    expect(calls).toHaveLength(2);
    expect(calls[1].service_data).toMatchObject({ override: true });
    expect(text(el)).not.toContain("had Medicine A recently");
  });

  it("logs an allowed dose straight away", async () => {
    const states = baseStates();
    states["sensor.alice_medicine_a_next_dose_allowed"] = entityState("sensor.alice_medicine_a_next_dose_allowed", iso(-HOUR));
    const hass = makeHass({ log_dose: () => ({ response: { logged: true, too_soon: false } }) }, states);
    const el = await mount(hass);
    await click(el, "Medicine A");
    expect(serviceCalls(hass, "log_dose")).toHaveLength(1);
    expect(text(el)).not.toContain("recently");
  });

  it("sends the chosen earlier time with the next entry only", async () => {
    const hass = makeHass();
    const el = await mount(hass);
    await click(el, "Earlier?");
    const when = "2026-11-18T08:30";
    type(el, "input[type=datetime-local]", when);
    await click(el, "Diarrhoea");
    expect(serviceCalls(hass, "log_symptom")[0].service_data).toMatchObject({
      symptom: "Diarrhoea",
      occurred_at: new Date(when).toISOString(),
    });
    // the "earlier" setting resets after one entry
    expect(root(el).querySelector("input[type=datetime-local]")).toBeNull();
    await click(el, "Vomiting");
    expect(serviceCalls(hass, "log_symptom")[1].service_data).not.toHaveProperty("occurred_at");
  });

  it("starts an illness with a name", async () => {
    const hass = makeHass();
    const el = await mount(hass);
    await click(el, "Start illness");
    type(el, "input[placeholder^=Illness]", "Chickenpox");
    await click(el, "Start");
    expect(serviceCalls(hass, "start_episode")[0].service_data).toMatchObject({
      config_entry: "abc123",
      illness: "Chickenpox",
    });
  });

  it("ends an open illness", async () => {
    const states = baseStates();
    states["binary_sensor.alice_currently_ill"] = entityState("binary_sensor.alice_currently_ill", "on", {});
    const hass = makeHass({}, states);
    const el = await mount(hass);
    await click(el, "End illness");
    expect(serviceCalls(hass, "end_episode")).toHaveLength(1);
  });

  it("shows service errors", async () => {
    const hass = makeHass({
      log_symptom: () => {
        throw { code: "service_validation_error", message: "Alice has no symptom type called 'Rash'." };
      },
    });
    const el = await mount(hass);
    await click(el, "Vomiting");
    expect(text(el)).toContain("has no symptom type");
  });
});

describe("deleting", () => {
  it("asks first, then deletes the record", async () => {
    const hass = makeHass();
    const el = await mount(hass);
    (root(el).querySelector('.item[data-id="t2"] .icon-btn') as HTMLButtonElement).click();
    await settle(el);
    expect(serviceCalls(hass, "delete_entry")).toHaveLength(0);

    await click(el, "Delete");
    const calls = serviceCalls(hass, "delete_entry");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      return_response: false,
      service_data: { config_entry: "abc123", kind: "temperature", record_id: "t2" },
    });
  });

  it("can be cancelled", async () => {
    const hass = makeHass();
    const el = await mount(hass);
    (root(el).querySelector(".item .icon-btn") as HTMLButtonElement).click();
    await settle(el);
    await click(el, "Keep");
    expect(serviceCalls(hass, "delete_entry")).toHaveLength(0);
  });
});

describe("live updates", () => {
  it("refetches history when an entity changes", async () => {
    const hass = makeHass();
    const el = await mount(hass);
    const before = serviceCalls(hass, "get_history").length;

    const states = baseStates();
    states["sensor.alice_vomiting_last_occurred"] = {
      ...states["sensor.alice_vomiting_last_occurred"],
      state: iso(-MIN),
      last_updated: iso(0),
    };
    el.hass = { ...hass, states } as Hass;
    await new Promise((r) => setTimeout(r, 500)); // debounce
    await settle(el);

    expect(serviceCalls(hass, "get_history").length).toBeGreaterThan(before);
  });
});
