import { ChildHealthCard } from "./child-health-card";
import { ChildHealthCardEditor } from "./child-health-card-editor";

declare global {
  interface Window {
    customCards?: { type: string; name: string; description: string; preview?: boolean; documentationURL?: string }[];
  }
}

if (!customElements.get("child-health-card")) {
  customElements.define("child-health-card", ChildHealthCard);
}
if (!customElements.get("child-health-card-editor")) {
  customElements.define("child-health-card-editor", ChildHealthCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "child-health-card")) {
  window.customCards.push({
    type: "child-health-card",
    name: "Child Health",
    description: "Log symptoms, temperatures and medicines for a child, with all-clear and next-dose countdowns.",
    preview: false,
    documentationURL: "https://github.com/th0mashoward/ha_child_health",
  });
}
