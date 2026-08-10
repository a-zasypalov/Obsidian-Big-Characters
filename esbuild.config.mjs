import esbuild from "esbuild";

const sharedOptions = {
  bundle: true,
  minify: true,
  platform: "browser",
  target: "es2020",
  logLevel: "info"
};

await Promise.all([
  esbuild.build({
    ...sharedOptions,
    entryPoints: ["src/main.ts"],
    outfile: "main.js",
    format: "cjs",
    external: ["obsidian"]
  }),
  esbuild.build({
    ...sharedOptions,
    entryPoints: ["src/pinyin-engine.ts"],
    outfile: "pinyin-engine.js",
    format: "iife",
    globalName: "CharactersPronunciationPinyin"
  })
]);
