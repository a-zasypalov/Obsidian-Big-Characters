import esbuild from "esbuild";
import { cp, rm } from "node:fs/promises";
import { resolve } from "node:path";

const sharedOptions = {
  bundle: true,
  minify: true,
  platform: "browser",
  target: "es2020",
  logLevel: "info"
};

const kuromojiBrowserEntryPlugin = {
  name: "kuromoji-browser-entry",
  setup(build) {
    build.onResolve({ filter: /^@faanau\/kuromoji$/ }, () => ({
      path: resolve("node_modules/@faanau/kuromoji/src/kuromoji.js")
    }));
  }
};

const [pinyinEngine, koreanEngine, japaneseEngine] = await Promise.all([
  esbuild.build({
    ...sharedOptions,
    entryPoints: ["src/pinyin-engine.ts"],
    format: "iife",
    globalName: "CharactersPronunciationPinyin",
    write: false
  }),
  esbuild.build({
    ...sharedOptions,
    entryPoints: ["src/korean-engine.ts"],
    format: "iife",
    globalName: "CharactersPronunciationKorean",
    write: false
  }),
  esbuild.build({
    ...sharedOptions,
    entryPoints: ["src/japanese-engine.ts"],
    format: "iife",
    globalName: "CharactersPronunciationJapanese",
    plugins: [kuromojiBrowserEntryPlugin],
    write: false
  })
]);

const pronunciationFactoryPlugin = {
  name: "pronunciation-factory",
  setup(build) {
    build.onResolve({ filter: /^virtual:(pinyin|korean|japanese)-engine$/ }, (args) => ({
      path: args.path,
      namespace: "pronunciation-factory"
    }));
    build.onLoad({ filter: /.*/, namespace: "pronunciation-factory" }, (args) => {
      if (args.path === "virtual:pinyin-engine") {
        return {
          contents: `export const createPinyinEngine = () => {\n${pinyinEngine.outputFiles[0].text}\nreturn CharactersPronunciationPinyin.pinyin;\n};`,
          loader: "js"
        };
      }
      if (args.path === "virtual:japanese-engine") {
        return {
          contents: `export const loadJapaneseEngine = () => {\n${japaneseEngine.outputFiles[0].text}\nreturn CharactersPronunciationJapanese;\n};`,
          loader: "js"
        };
      }
      return {
        contents: `export const createKoreanEngine = () => {\n${koreanEngine.outputFiles[0].text}\nreturn CharactersPronunciationKorean.romanizeKorean;\n};`,
        loader: "js"
      };
    });
  }
};

await Promise.all([
  esbuild.build({
    ...sharedOptions,
    entryPoints: ["src/main.ts"],
    outfile: "main.js",
    format: "cjs",
    external: ["obsidian"],
    plugins: [pronunciationFactoryPlugin]
  }),
  cp("node_modules/@faanau/kuromoji/dict", "japanese-dictionary", { recursive: true }),
  rm("pinyin-engine.js", { force: true }),
  rm("korean-engine.js", { force: true }),
  rm("japanese-engine.js", { force: true })
]);
