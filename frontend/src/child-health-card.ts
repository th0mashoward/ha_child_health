import { LitElement, html, nothing, svg, type PropertyValues, type TemplateResult } from "lit";
import {
  CHART_PAD,
  chartModel,
  formatAgo,
  formatDuration,
  formatWhen,
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
  type TimelineItem,
} from "./logic";
import { cardStyles } from "./styles";
import type { CardConfig, ChildInfo, Hass, History, MedicineInfo, SymptomInfo } from "./types";

const DOMAIN = "child_health";
const TICK_MS = 30_000;
const REFETCH_MS = 5 * 60_000;
const TIMELINE_LIMIT = 8;

interface DoseConfirm {
  medicine: string;
  next: number;
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

export class ChildHealthCard extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _children: { state: true },
    _history: { state: true },
    _panel: { state: true },
    _tempText: { state: true },
    _illnessText: { state: true },
    _earlier: { state: true },
    _earlierValue: { state: true },
    _confirmDose: { state: true },
    _confirmDelete: { state: true },
    _showAll: { state: true },
    _busy: { state: true },
    _error: { state: true },
  };

  static styles = cardStyles;

  declare hass?: Hass;
  declare _config?: CardConfig;
  declare _children: ChildInfo[];
  declare _history?: History;
  declare _panel: "temperature" | "illness" | null;
  declare _tempText: string;
  declare _illnessText: string;
  declare _earlier: boolean;
  declare _earlierValue: string;
  declare _confirmDose: DoseConfirm | null;
  declare _confirmDelete: string | null;
  declare _showAll: boolean;
  declare _busy: boolean;
  declare _error: string;

  private _timer?: number;
  private _refreshTimer?: number;
  private _sig = "";
  private _lastFetch = 0;
  private _fetching = false;
  private _again = false;

  constructor() {
    super();
    this._children = [];
    this._panel = null;
    this._tempText = "";
    this._illnessText = "";
    this._earlier = false;
    this._earlierValue = "";
    this._confirmDose = null;
    this._confirmDelete = null;
    this._showAll = false;
    this._busy = false;
    this._error = "";
  }

  // ----- Lovelace card API -----

  static getConfigElement(): HTMLElement {
    return document.createElement("child-health-card-editor");
  }

  static getStubConfig(): Record<string, unknown> {
    return {};
  }

  setConfig(config: CardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    this._config = { show_chart: true, show_timeline: true, ...config, days: this._clampDays(config.days) };
    this._sig = "";
  }

  getCardSize(): number {
    return 8;
  }

  // ----- lifecycle -----

  connectedCallback(): void {
    super.connectedCallback();
    this._timer = window.setInterval(() => this._tick(), TICK_MS);
    void this._refreshAll();
  }

  disconnectedCallback(): void {
    window.clearInterval(this._timer);
    window.clearTimeout(this._refreshTimer);
    super.disconnectedCallback();
  }

  protected willUpdate(changed: PropertyValues): void {
    if (changed.has("hass") || changed.has("_config")) this._syncWithHass();
  }

  private _tick(): void {
    // countdowns are computed at render time
    this.requestUpdate();
    if (Date.now() - this._lastFetch > REFETCH_MS) void this._refreshAll();
  }

  private _syncWithHass(): void {
    if (!this.hass || !this._config) return;
    const child = this._child();
    if (!child) {
      if (!this._fetching && Date.now() - this._lastFetch > 10_000) void this._refreshAll();
      return;
    }
    const sig = signature(this.hass, trackedEntities(child));
    if (sig === this._sig) return;
    const first = this._sig === "";
    this._sig = sig;
    if (first) {
      void this._refreshAll();
    } else {
      window.clearTimeout(this._refreshTimer);
      this._refreshTimer = window.setTimeout(() => void this._refreshAll(), 400);
    }
  }

  // ----- data -----

  private _clampDays(days: unknown): number {
    const n = Number(days);
    return Number.isFinite(n) && n >= 1 ? Math.min(14, Math.round(n)) : 3;
  }

  private _child(): ChildInfo | undefined {
    const config = this._config;
    if (!config) return undefined;
    if (config.entry_id) return this._children.find((c) => c.entry_id === config.entry_id);
    if (config.child) {
      const wanted = config.child.toLowerCase();
      return this._children.find((c) => c.name.toLowerCase() === wanted);
    }
    return undefined;
  }

  private async _refreshAll(): Promise<void> {
    if (!this.hass) return;
    if (this._fetching) {
      this._again = true;
      return;
    }
    this._fetching = true;
    try {
      do {
        this._again = false;
        await this._fetchOnce();
      } while (this._again);
    } finally {
      this._fetching = false;
    }
  }

  private async _fetchOnce(): Promise<void> {
    const hass = this.hass;
    if (!hass) return;
    try {
      this._children = await hass.callWS<ChildInfo[]>({ type: "child_health/children" });
      this._lastFetch = Date.now();
      const child = this._child();
      if (child) {
        this._history = await this._service<History>("get_history", { days: this._config?.days ?? 3 }, true, child);
        this._sig = signature(hass, trackedEntities(child));
      }
      this._error = "";
    } catch (err) {
      this._error = errorMessage(err);
    }
  }

  private async _service<T>(
    service: string,
    data: Record<string, unknown>,
    withResponse: boolean,
    child: ChildInfo | undefined = this._child(),
  ): Promise<T> {
    if (!this.hass || !child) throw new Error("Child not loaded");
    const result = await this.hass.callWS<{ response?: T }>({
      type: "call_service",
      domain: DOMAIN,
      service,
      service_data: { config_entry: child.entry_id, ...data },
      return_response: withResponse,
    });
    return result.response as T;
  }

  private _occurredAt(): Record<string, unknown> {
    const iso = this._earlier ? localInputToIso(this._earlierValue) : undefined;
    return iso ? { occurred_at: iso } : {};
  }

  private _toast(message: string): void {
    this.dispatchEvent(new CustomEvent("hass-notification", { detail: { message }, bubbles: true, composed: true }));
  }

  /** Run an action once at a time. The callback returns false if it needs another step. */
  private async _run(action: () => Promise<boolean | void>): Promise<void> {
    if (this._busy) return;
    this._busy = true;
    this._error = "";
    try {
      const finished = await action();
      if (finished !== false) {
        this._earlier = false;
        this._earlierValue = "";
        await this._refreshAll();
      }
    } catch (err) {
      this._error = errorMessage(err);
    } finally {
      this._busy = false;
    }
  }

  // ----- actions -----

  private _logSymptom(sym: SymptomInfo): Promise<void> {
    return this._run(async () => {
      await this._service("log_symptom", { symptom: sym.name, ...this._occurredAt() }, true);
      this._toast(`${sym.name} logged`);
    });
  }

  private _logTemperature(): Promise<void> {
    return this._run(async () => {
      const value = parseTemperature(this._tempText);
      if (value === null) {
        this._error = "Enter a temperature like 38.4";
        return false;
      }
      await this._service("log_temperature", { temperature: value, ...this._occurredAt() }, true);
      this._tempText = "";
      this._panel = null;
      this._toast(`Temperature ${value} logged`);
    });
  }

  private _logDose(med: MedicineInfo, override = false): Promise<void> {
    return this._run(async () => {
      const res = await this._service<{ logged: boolean; too_soon?: boolean; next_dose_allowed?: string }>(
        "log_dose",
        { medicine: med.name, fail_if_too_soon: false, override, ...this._occurredAt() },
        true,
      );
      if (!res.logged && res.too_soon) {
        this._confirmDose = { medicine: med.name, next: Date.parse(res.next_dose_allowed ?? "") };
        return false;
      }
      this._confirmDose = null;
      this._toast(`${med.name} logged`);
    });
  }

  private _startIllness(): Promise<void> {
    return this._run(async () => {
      const illness = this._illnessText.trim();
      await this._service("start_episode", { ...(illness ? { illness } : {}), ...this._occurredAt() }, true);
      this._illnessText = "";
      this._panel = null;
    });
  }

  private _endIllness(): Promise<void> {
    return this._run(async () => {
      await this._service("end_episode", this._occurredAt(), true);
    });
  }

  private _delete(item: TimelineItem): Promise<void> {
    return this._run(async () => {
      await this._service("delete_entry", { kind: item.kind, record_id: item.id }, false);
      this._confirmDelete = null;
    });
  }

  private _togglePanel(panel: "temperature" | "illness"): void {
    this._panel = this._panel === panel ? null : panel;
    this._confirmDose = null;
  }

  private _toggleEarlier(): void {
    this._earlier = !this._earlier;
    if (this._earlier && !this._earlierValue) this._earlierValue = nowForInput(Date.now());
  }

  // ----- rendering -----

  protected render(): TemplateResult | typeof nothing {
    const config = this._config;
    if (!config) return nothing;
    if (!config.entry_id && !config.child) {
      return html`<ha-card><div class="empty">Choose a child in the card settings.</div></ha-card>`;
    }
    const child = this._child();
    if (!child || !this.hass) {
      const message = this._error || (this._children.length ? "That child wasn't found." : "Loading…");
      return html`<ha-card><div class="empty">${message}</div></ha-card>`;
    }
    const now = Date.now();
    return html`
      <ha-card>
        ${this._header(child, now)}
        ${this._error ? html`<div class="error" role="alert">${this._error}</div>` : nothing}
        ${this._status(child, now)} ${this._actions(child, now)} ${this._panels(child, now)}
        ${config.show_chart === false ? nothing : this._chart(child, now)}
        ${config.show_timeline === false ? nothing : this._timeline(child, now)}
        <div class="footer">
          Records only. Doses use the gap you set from the medicine label; this card never suggests a dose.
        </div>
      </ha-card>
    `;
  }

  private _header(child: ChildInfo, now: number): TemplateResult {
    const hass = this.hass as Hass;
    const temp = temperatureStatus(child, hass);
    const ill = illStatus(child, hass);
    const recheck = recheckAt(child, hass);
    return html`
      <div class="header">
        <div class="name">${this._config?.title || child.name}</div>
        <div class="chips">
          ${ill.ill
            ? html`<span class="chip warn"><ha-icon icon="mdi:emoticon-sick"></ha-icon>${ill.illness ? `Ill: ${ill.illness}` : "Ill"}</span>`
            : html`<span class="chip ok"><ha-icon icon="mdi:emoticon-happy-outline"></ha-icon>Well</span>`}
          ${temp
            ? html`<span class="chip ${temp.fever ? "bad" : "ok"}"
                ><ha-icon icon="mdi:thermometer"></ha-icon>${temp.value}${child.unit_symbol}${temp.recordedAt
                  ? ` · ${formatAgo(now - temp.recordedAt.getTime())}`
                  : ""}</span
              >`
            : nothing}
          ${recheck
            ? html`<span class="chip ${now >= recheck.getTime() ? "warn" : "info"}"
                ><ha-icon icon="mdi:thermometer-alert"></ha-icon>${now >= recheck.getTime()
                  ? "Recheck now"
                  : `Recheck in ${formatDuration(recheck.getTime() - now)}`}</span
              >`
            : nothing}
        </div>
      </div>
    `;
  }

  private _status(child: ChildInfo, now: number): TemplateResult | typeof nothing {
    if (!child.symptoms.length && !child.medicines.length) return nothing;
    const hass = this.hass as Hass;
    const locale = hass.locale?.language;
    return html`
      <div class="status">
        ${child.symptoms.map((sym) => {
          const st = symptomStatus(sym, hass, now);
          const last = st.last ? `Last ${formatAgo(now - st.last.getTime())}` : "";
          return html`
            <div class="row" data-kind="symptom">
              <ha-icon icon=${st.clear ? "mdi:check-circle-outline" : "mdi:timer-sand"}></ha-icon>
              <div class="grow">
                <div class="label">${sym.name}</div>
                ${last ? html`<div class="sub">${last}</div>` : nothing}
                ${!st.clear
                  ? html`<div class="bar"><div class="fill" style="width:${Math.round(st.progress * 100)}%"></div></div>`
                  : nothing}
              </div>
              ${st.clear
                ? st.last
                  ? html`<div class="value ok">All clear</div>`
                  : html`<div class="value muted">None logged</div>`
                : html`<div class="value warn">
                    Clear in ${formatDuration((st.clearAt as Date).getTime() - now)}
                  </div>`}
            </div>
          `;
        })}
        ${child.medicines.map((med) => {
          const st = medicineStatus(med, hass, now);
          const last = st.last ? `Last ${formatAgo(now - st.last.getTime())}` : "Not given yet";
          return html`
            <div class="row" data-kind="medicine">
              <ha-icon icon=${st.allowed ? "mdi:pill" : "mdi:pill-off"}></ha-icon>
              <div class="grow">
                <div class="label">${med.name}</div>
                <div class="sub">
                  ${last}${!st.allowed && st.next ? ` · allowed from ${formatWhen(st.next.getTime(), now, locale)}` : ""}
                </div>
              </div>
              ${st.allowed
                ? html`<div class="value ok">Allowed now</div>`
                : html`<div class="value warn">In ${formatDuration((st.next as Date).getTime() - now)}</div>`}
            </div>
          `;
        })}
      </div>
    `;
  }

  private _actions(child: ChildInfo, now: number): TemplateResult {
    const hass = this.hass as Hass;
    const ill = illStatus(child, hass);
    return html`
      <div class="actions">
        ${child.symptoms.map(
          (sym) => html`<button class="act" ?disabled=${this._busy} @click=${() => this._logSymptom(sym)}>
            <ha-icon icon="mdi:emoticon-sick-outline"></ha-icon>${sym.name}
          </button>`,
        )}
        <button class="act ${this._panel === "temperature" ? "on" : ""}" @click=${() => this._togglePanel("temperature")}>
          <ha-icon icon="mdi:thermometer-plus"></ha-icon>Temperature
        </button>
        ${child.medicines.map((med) => {
          const allowed = medicineStatus(med, hass, now).allowed;
          return html`<button
            class="act ${allowed ? "" : "caution"}"
            ?disabled=${this._busy}
            @click=${() => this._logDose(med)}
          >
            <ha-icon icon=${allowed ? "mdi:pill" : "mdi:pill-off"}></ha-icon>${med.name}
          </button>`;
        })}
        ${ill.ill
          ? html`<button class="act" ?disabled=${this._busy} @click=${() => this._endIllness()}>
              <ha-icon icon="mdi:check-circle-outline"></ha-icon>End illness
            </button>`
          : html`<button class="act ${this._panel === "illness" ? "on" : ""}" @click=${() => this._togglePanel("illness")}>
              <ha-icon icon="mdi:medical-bag"></ha-icon>Start illness
            </button>`}
        <button class="act ${this._earlier ? "on" : ""}" @click=${() => this._toggleEarlier()}>
          <ha-icon icon="mdi:history"></ha-icon>Earlier?
        </button>
      </div>
    `;
  }

  private _panels(child: ChildInfo, now: number): TemplateResult {
    const locale = this.hass?.locale?.language;
    return html`
      ${this._earlier
        ? html`<div class="panel">
            <label>
              When
              <input
                type="datetime-local"
                max=${nowForInput(now)}
                .value=${this._earlierValue}
                @input=${(e: Event) => (this._earlierValue = (e.target as HTMLInputElement).value)}
              />
            </label>
            <span class="hint">Applies to the next entry you log.</span>
          </div>`
        : nothing}
      ${this._panel === "temperature"
        ? html`<div class="panel">
            <input
              class="temp"
              type="text"
              inputmode="decimal"
              placeholder="e.g. 38.4"
              aria-label="Temperature"
              .value=${this._tempText}
              @input=${(e: Event) => (this._tempText = (e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => e.key === "Enter" && this._logTemperature()}
            />
            <span class="hint">${child.unit_symbol}</span>
            <button class="primary" ?disabled=${this._busy} @click=${() => this._logTemperature()}>Log</button>
            <button class="ghost" @click=${() => (this._panel = null)}>Cancel</button>
          </div>`
        : nothing}
      ${this._panel === "illness"
        ? html`<div class="panel">
            <input
              type="text"
              placeholder="Illness (optional)"
              aria-label="Illness"
              .value=${this._illnessText}
              @input=${(e: Event) => (this._illnessText = (e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => e.key === "Enter" && this._startIllness()}
            />
            <button class="primary" ?disabled=${this._busy} @click=${() => this._startIllness()}>Start</button>
            <button class="ghost" @click=${() => (this._panel = null)}>Cancel</button>
          </div>`
        : nothing}
      ${this._confirmDose
        ? html`<div class="panel caution" role="alert">
            <div class="msg">
              ${child.name} had ${this._confirmDose.medicine} recently. Based on the gap you set, the next dose is allowed
              from ${formatWhen(this._confirmDose.next, now, locale)}.
            </div>
            <button
              class="danger"
              ?disabled=${this._busy}
              @click=${() => {
                const med = child.medicines.find((m) => m.name === this._confirmDose?.medicine);
                if (med) void this._logDose(med, true);
              }}
            >
              Log anyway
            </button>
            <button class="ghost" @click=${() => (this._confirmDose = null)}>Cancel</button>
          </div>`
        : nothing}
    `;
  }

  private _chart(child: ChildInfo, now: number): TemplateResult {
    const days = this._config?.days ?? 3;
    const locale = this.hass?.locale?.language;
    const model = chartModel(this._history?.temperatures ?? [], child.fever_threshold, now, days, 320, 140, locale);
    const left = CHART_PAD.left;
    const right = model.width - CHART_PAD.right;
    return html`
      <div class="section">
        <div class="section-title">Temperature · last ${days} ${days === 1 ? "day" : "days"}</div>
        ${model.empty
          ? html`<div class="muted">No temperatures logged in this time.</div>`
          : html`<svg class="chart" viewBox="0 0 ${model.width} ${model.height}" role="img" aria-label="Temperature chart">
              ${model.yTicks.map(
                (t) => svg`<line class="grid" x1=${left} x2=${right} y1=${t.y} y2=${t.y}></line>
                  <text class="tick" x=${left - 4} y=${t.y + 3} text-anchor="end">${t.label}</text>`,
              )}
              ${model.xTicks.map(
                (t) => svg`<line class="grid v" x1=${t.x} x2=${t.x} y1=${CHART_PAD.top} y2=${model.height - CHART_PAD.bottom}></line>
                  <text class="tick" x=${t.x} y=${model.height - 8} text-anchor="middle">${t.label}</text>`,
              )}
              <line class="threshold" x1=${left} x2=${right} y1=${model.thresholdY} y2=${model.thresholdY}></line>
              ${model.path ? svg`<path class="line" d=${model.path}></path>` : nothing}
              ${model.points.map(
                (p) => svg`<circle class="pt ${p.fever ? "fever" : ""}" cx=${p.x} cy=${p.y} r="3.5">
                  <title>${p.value}${child.unit_symbol} · ${formatWhen(p.at, now, locale)}</title>
                </circle>`,
              )}
            </svg>`}
      </div>
    `;
  }

  private _timeline(child: ChildInfo, now: number): TemplateResult | typeof nothing {
    if (!this._history) return nothing;
    const locale = this.hass?.locale?.language;
    const items = timeline(this._history, child);
    if (items.length === 0) return html`<div class="section"><div class="section-title">Recent</div><div class="muted">Nothing logged yet.</div></div>`;
    const shown = this._showAll ? items : items.slice(0, TIMELINE_LIMIT);
    return html`
      <div class="section">
        <div class="section-title">Recent</div>
        ${shown.map(
          (item) => html`
            <div class="item ${item.fever ? "fever" : ""}" data-id=${item.id}>
              <ha-icon icon=${item.icon}></ha-icon>
              <div class="grow">
                <div class="t">${item.title}</div>
                ${item.detail ? html`<div class="sub">${item.detail}</div>` : nothing}
              </div>
              <div class="when">${formatWhen(item.at, now, locale)}</div>
              ${this._confirmDelete === item.id
                ? html`<span class="del-confirm">
                    <button class="danger" ?disabled=${this._busy} @click=${() => this._delete(item)}>Delete</button>
                    <button class="ghost" @click=${() => (this._confirmDelete = null)}>Keep</button>
                  </span>`
                : html`<button
                    class="icon-btn"
                    title="Delete"
                    aria-label="Delete entry"
                    @click=${() => (this._confirmDelete = item.id)}
                  >
                    <ha-icon icon="mdi:delete-outline"></ha-icon>
                  </button>`}
            </div>
          `,
        )}
        ${items.length > TIMELINE_LIMIT
          ? html`<button class="more" @click=${() => (this._showAll = !this._showAll)}>
              ${this._showAll ? "Show less" : `Show all ${items.length}`}
            </button>`
          : nothing}
      </div>
    `;
  }
}
