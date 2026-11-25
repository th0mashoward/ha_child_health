// Renders ../assets/icon.svg to the integration's brand/ folder (HA 2026.3+ shows these).
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const svg = readFileSync(`${root}assets/icon.svg`, "utf8");
const out = `${root}custom_components/child_health/brand`;
mkdirSync(out, { recursive: true });

for (const [name, size] of [
  ["icon.png", 256],
  ["icon@2x.png", 512],
]) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(`${out}/${name}`, png);
  console.log(`${name} ${size}x${size}`);
}
