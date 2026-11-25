import { css } from "lit";

export const cardStyles = css`
  :host {
    display: block;
  }
  ha-card {
    padding-bottom: 12px;
    overflow: hidden;
  }
  .header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 16px 16px 4px;
  }
  .name {
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--primary-text-color);
    margin-right: auto;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px 3px 6px;
    border-radius: 999px;
    font-size: 0.8rem;
    background: var(--secondary-background-color);
    color: var(--primary-text-color);
    --mdc-icon-size: 16px;
  }
  .chip.ok {
    color: var(--success-color, #2e7d32);
  }
  .chip.warn,
  .chip.bad {
    color: var(--error-color, #c62828);
    font-weight: 500;
  }
  .chip.info {
    color: var(--primary-color);
  }
  .empty {
    padding: 24px 16px;
    color: var(--secondary-text-color);
  }
  .error {
    margin: 8px 16px 0;
    padding: 8px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--error-color, #c62828) 14%, transparent);
    color: var(--error-color, #c62828);
    font-size: 0.9rem;
  }
  .status {
    padding: 4px 16px 0;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--divider-color);
    --mdc-icon-size: 22px;
    color: var(--secondary-text-color);
  }
  .row:last-child {
    border-bottom: none;
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .label {
    color: var(--primary-text-color);
    font-weight: 500;
  }
  .sub {
    font-size: 0.8rem;
    color: var(--secondary-text-color);
  }
  .value {
    font-size: 0.9rem;
    text-align: right;
    white-space: nowrap;
  }
  .value.ok {
    color: var(--success-color, #2e7d32);
  }
  .value.warn {
    color: var(--warning-color, #ef6c00);
    font-weight: 500;
  }
  .value.muted {
    color: var(--secondary-text-color);
  }
  .bar {
    height: 4px;
    margin-top: 6px;
    border-radius: 2px;
    background: var(--divider-color);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--warning-color, #ef6c00);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px 4px;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .act {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid var(--divider-color);
    border-radius: 999px;
    background: var(--card-background-color);
    color: var(--primary-text-color);
    --mdc-icon-size: 18px;
  }
  .act:hover:not(:disabled) {
    border-color: var(--primary-color);
  }
  .act.caution {
    border-style: dashed;
    color: var(--secondary-text-color);
  }
  .act.on {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }
  .panel {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin: 8px 16px 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--secondary-background-color);
  }
  .panel.caution {
    background: color-mix(in srgb, var(--warning-color, #ef6c00) 14%, transparent);
  }
  .panel .msg {
    flex: 1 1 100%;
    font-size: 0.9rem;
    color: var(--primary-text-color);
  }
  .hint {
    font-size: 0.8rem;
    color: var(--secondary-text-color);
  }
  input {
    font: inherit;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid var(--divider-color);
    background: var(--card-background-color);
    color: var(--primary-text-color);
    min-width: 0;
  }
  input.temp {
    width: 7em;
  }
  .primary,
  .ghost,
  .danger {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid transparent;
  }
  .primary {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }
  .danger {
    background: var(--error-color, #c62828);
    color: #fff;
  }
  .ghost {
    background: transparent;
    border-color: var(--divider-color);
    color: var(--primary-text-color);
  }
  .section {
    padding: 14px 16px 0;
  }
  .section-title {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--secondary-text-color);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 6px;
  }
  .muted {
    color: var(--secondary-text-color);
    font-size: 0.9rem;
  }
  .chart {
    width: 100%;
    height: auto;
  }
  .chart .grid {
    stroke: var(--divider-color);
    stroke-width: 1;
  }
  .chart .grid.v {
    stroke-dasharray: 2 3;
  }
  .chart .tick {
    fill: var(--secondary-text-color);
    font-size: 9px;
  }
  .chart .threshold {
    stroke: var(--error-color, #c62828);
    stroke-width: 1;
    stroke-dasharray: 4 3;
    opacity: 0.8;
  }
  .chart .line {
    fill: none;
    stroke: var(--primary-color);
    stroke-width: 2;
  }
  .chart .pt {
    fill: var(--primary-color);
  }
  .chart .pt.fever {
    fill: var(--error-color, #c62828);
  }
  .item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid var(--divider-color);
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color);
  }
  .item:last-child {
    border-bottom: none;
  }
  .item.fever .t {
    color: var(--error-color, #c62828);
  }
  .item .t {
    color: var(--primary-text-color);
  }
  .when {
    font-size: 0.8rem;
    color: var(--secondary-text-color);
    white-space: nowrap;
  }
  .icon-btn {
    background: none;
    border: none;
    padding: 4px;
    color: var(--secondary-text-color);
    border-radius: 50%;
    display: inline-flex;
  }
  .del-confirm {
    display: inline-flex;
    gap: 6px;
  }
  .more {
    margin-top: 6px;
    background: none;
    border: none;
    padding: 4px 0;
    color: var(--primary-color);
  }
  .footer {
    padding: 12px 16px 0;
    font-size: 0.75rem;
    color: var(--secondary-text-color);
  }
`;
