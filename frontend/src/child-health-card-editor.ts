import { LitElement, html, nothing, type TemplateResult } from "lit";
import type { CardConfig, Hass } from "./types";

const SCHEMA = [
  { name: "entry_id", selector: { config_entry: { integration: "child_health" } } },
  { name: "title", selector: { text: {} } },
  { name: "days", selector: { number: { min: 1, max: 14, mode: "box" } } },
  { name: "show_chart", selector: { boolean: {} } },
  { name: "show_timeline", selector: { boolean: {} } },
];

const LABELS: Record<string, string> = {
  entry_id: "Child",
  title: "Title (optional)",
  days: "Days of history",
  show_chart: "Show temperature chart",
  show_timeline: "Show recent entries",
};

export class ChildHealthCardEditor extends LitElement {
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  declare hass?: Hass;
  declare _config?: CardConfig;

  setConfig(config: CardConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) return nothing;
    const data = { show_chart: true, show_timeline: true, days: 3, ...this._config };
    return html`<ha-form
      .hass=${this.hass}
      .data=${data}
      .schema=${SCHEMA}
      .computeLabel=${(schema: { name: string }) => LABELS[schema.name] ?? schema.name}
      @value-changed=${this._changed}
    ></ha-form>`;
  }

  private _changed(ev: CustomEvent<{ value: Partial<CardConfig> }>): void {
    const config = { ...this._config, ...ev.detail.value } as CardConfig;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
}
