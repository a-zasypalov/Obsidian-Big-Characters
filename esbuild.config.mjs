import esbuild from "esbuild";
import { rm } from "node:fs/promises";

const sharedOptions = {
  bundle: true,
  minify: true,
  platform: "browser",
  target: "es2020",
  logLevel: "info"
};

const pinyinEngine = await esbuild.build({
  ...sharedOptions,
  entryPoints: ["src/pinyin-engine.ts"],
  format: "iife",
  globalName: "CharactersPronunciationPinyin",
  write: false
});

const pinyinFactoryPlugin = {
  name: "pinyin-factory",
  setup(build) {
    build.onResolve({ filter: /^virtual:pinyin-engine$/ }, () => ({
      path: "virtual:pinyin-engine",
      namespace: "pinyin-factory"
    }));
    build.onLoad({ filter: /.*/, namespace: "pinyin-factory" }, () => ({
      contents: `export const createPinyinEngine = () => {\n${pinyinEngine.outputFiles[0].text}\nreturn CharactersPronunciationPinyin.pinyin;\n};`,
      loader: "js"
    }));
  }
};

await Promise.all([
  esbuild.build({
    ...sharedOptions,
    entryPoints: ["src/main.ts"],
    outfile: "main.js",
    format: "cjs",
    external: ["obsidian"],
    plugins: [pinyinFactoryPlugin]
  }),
  rm("pinyin-engine.js", { force: true })
]);
