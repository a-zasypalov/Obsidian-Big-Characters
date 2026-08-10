import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  format: "cjs",
  platform: "browser",
  target: "es2020",
  external: ["obsidian", "@codemirror/state", "@codemirror/view"],
  logLevel: "info"
});
