import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { Window } from "happy-dom";

async function waitForProcessed(element) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (element.dataset.bcPronunciationProcessed) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail("Japanese pronunciation did not finish rendering");
}

test("bundles all lazy pronunciation engines and the Japanese dictionary into main.js", async () => {
  const [main, mainStats] = await Promise.all([readFile("main.js", "utf8"), stat("main.js")]);

  assert.doesNotMatch(main, /pinyin-engine\.js/u);
  assert.doesNotMatch(main, /korean-engine\.js/u);
  assert.doesNotMatch(main, /japanese-engine\.js/u);
  assert.doesNotMatch(main, /document\.body/u);
  assert.doesNotMatch(main, /https?:\/\/[^"']+\.dat\.gz/u);
  assert.match(main, /toneSandhi/u);
  assert.match(main, /DecompressionStream/u);
  for (const command of [
    "wrap-selection-as-japanese",
    "wrap-selection-as-japanese-romaji",
    "wrap-selection-as-japanese-furigana"
  ]) assert.match(main, new RegExp(command, "u"));
  for (const name of [
    "base.dat.gz",
    "cc.dat.gz",
    "check.dat.gz",
    "tid.dat.gz",
    "tid_map.dat.gz",
    "tid_pos.dat.gz",
    "unk.dat.gz",
    "unk_char.dat.gz",
    "unk_compat.dat.gz",
    "unk_invoke.dat.gz",
    "unk_map.dat.gz",
    "unk_pos.dat.gz"
  ]) assert.match(main, new RegExp(name.replaceAll(".", "\\."), "u"));
  assert.ok(mainStats.size > 20 * 1024 * 1024, `main.js is unexpectedly small: ${mainStats.size} bytes`);
  assert.ok(mainStats.size < 26 * 1024 * 1024, `main.js is ${mainStats.size} bytes`);

  const module = { exports: {} };
  const ObsidianClass = class {};
  runInNewContext(main, {
    module,
    require: (name) => {
      assert.equal(name, "obsidian");
      return {
        MarkdownView: ObsidianClass,
        Notice: ObsidianClass,
        Plugin: ObsidianClass,
        PluginSettingTab: ObsidianClass,
        Setting: ObsidianClass
      };
    }
  });
  assert.equal(
    typeof module.exports.default,
    "function",
    "loading the plugin must not initialize the Japanese engine"
  );

  await assert.rejects(stat("pinyin-engine.js"), { code: "ENOENT" });
  await assert.rejects(stat("korean-engine.js"), { code: "ENOENT" });
  await assert.rejects(stat("japanese-engine.js"), { code: "ENOENT" });
  await assert.rejects(stat("base.dat.gz"), { code: "ENOENT" });
});

test("keeps fenced pronunciation blocks on the inline-block layout path", async () => {
  const css = await readFile("styles.css", "utf8");
  const rule = css.match(/\.bc-code-block\s*\{([^}]*)\}/u)?.[1] ?? "";

  // A display or margin override here re-collapses the block's margins with the
  // surrounding paragraph margins, which silently discards the spacing settings.
  assert.doesNotMatch(rule, /\b(display|margin)\b/u);
  assert.match(css, /\.bc-ja-jp/u);
  assert.match(css, /\.bc-ja-jp-romaji/u);
  assert.match(css, /\.bc-ja-jp-furigana/u);
});

test("initializes the bundled Japanese engine from local adapter resources on first use", async () => {
  const main = await readFile("main.js", "utf8");
  const window = new Window();
  const files = new Map();
  const directories = new Set();
  const writes = [];
  const fetches = [];
  const notices = [];
  const processors = new Map();
  const adapter = {
    async exists(path) {
      return files.has(path) || directories.has(path);
    },
    async mkdir(path) {
      directories.add(path);
    },
    async write(path, data) {
      writes.push(path);
      files.set(path, new TextEncoder().encode(data));
    },
    async writeBinary(path, data) {
      writes.push(path);
      files.set(path, new Uint8Array(data));
    },
    getResourcePath(path) {
      return `app://local/${path}?1700000000000`;
    }
  };

  class Plugin {
    constructor(app, manifest) {
      this.app = app;
      this.manifest = manifest;
    }
    async loadData() {
      return {};
    }
    addCommand() {}
    addSettingTab() {}
    register() {}
    registerMarkdownPostProcessor() {}
    registerMarkdownCodeBlockProcessor(language, handler) {
      processors.set(language, handler);
    }
  }
  class Notice {
    constructor(message) {
      notices.push(message);
    }
  }
  const ObsidianClass = class {};
  const module = { exports: {} };
  const fetch = async (url) => {
    fetches.push(String(url));
    const bytes = files.get(String(url).replace("app://local/", ""));
    return bytes ? new Response(bytes) : new Response(null, { status: 404 });
  };
  runInNewContext(main, {
    module,
    require: () => ({
      MarkdownView: ObsidianClass,
      Notice,
      Plugin,
      PluginSettingTab: ObsidianClass,
      Setting: ObsidianClass
    }),
    window,
    document: window.document,
    Node: window.Node,
    Element: window.Element,
    NodeFilter: window.NodeFilter,
    MutationObserver: window.MutationObserver,
    fetch,
    Response,
    DecompressionStream,
    TextDecoder,
    TextEncoder,
    URL,
    Uint8Array,
    ArrayBuffer,
    Int16Array,
    Int32Array,
    Uint32Array,
    atob,
    setTimeout,
    clearTimeout
  });

  const PluginClass = module.exports.default;
  const plugin = new PluginClass(
    {
      vault: { adapter },
      workspace: {
        getLeavesOfType: () => [],
        onLayoutReady() {},
        on() {}
      }
    },
    { dir: ".obsidian/plugins/big-characters" }
  );
  await plugin.onload();

  const plain = window.document.createElement("div");
  processors.get("ja-jp")("日本語", plain);
  assert.equal(writes.length, 0);

  const romaji = window.document.createElement("div");
  processors.get("ja-jp-romaji")("座って", romaji);
  await waitForProcessed(romaji);
  assert.equal(romaji.querySelector("rt")?.textContent, "suwatte");
  assert.equal(writes.length, 13);
  assert.ok(writes.at(-1).endsWith("/.complete"));
  assert.ok(fetches.every((url) => url.startsWith("app://local/")));

  const furigana = window.document.createElement("div");
  processors.get("ja-jp-furigana")("食べる", furigana);
  await waitForProcessed(furigana);
  assert.equal(furigana.querySelector(".bc-base")?.textContent, "食");
  assert.equal(furigana.querySelector("rt")?.textContent, "た");
  assert.equal(writes.length, 13);
  assert.deepEqual(notices, []);
  window.close();
});
