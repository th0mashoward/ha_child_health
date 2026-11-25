import { describe, expect, it } from "vitest";

describe("production bundle", () => {
  it("loads in a browser-like environment and registers the card and its editor", async () => {
    await import("../../custom_components/child_health/frontend/child-health-card.js");
    expect(customElements.get("child-health-card")).toBeDefined();
    expect(customElements.get("child-health-card-editor")).toBeDefined();
    expect(window.customCards?.map((c) => c.type)).toContain("child-health-card");
  });
});
