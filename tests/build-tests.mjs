import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["tests/core.test.ts"],
  bundle: true,
  outfile: ".test-build/core.test.cjs",
  format: "cjs",
  platform: "node",
  target: "node20",
  external: ["@faanau/kuromoji", "happy-dom", "node:assert/strict", "node:test"]
});
