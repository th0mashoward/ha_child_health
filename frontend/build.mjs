import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "none",
  outfile: "../custom_components/child_health/frontend/child-health-card.js",
});
console.log("built child-health-card.js");
