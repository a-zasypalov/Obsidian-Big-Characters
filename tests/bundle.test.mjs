import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
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

test("keeps lazy pronunciation engines in main.js and Japanese dictionary files separate", async () => {
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
  const dictionaryNames = [
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
  ];
  assert.deepEqual((await readdir("japanese-dictionary")).sort(), dictionaryNames.sort());
  for (const name of dictionaryNames) {
    assert.match(main, new RegExp(name.replaceAll(".", "\\."), "u"));
    assert.deepEqual(
      await readFile(`japanese-dictionary/${name}`),
      await readFile(`node_modules/@faanau/kuromoji/dict/${name}`)
    );
  }
  assert.ok(mainStats.size < 1024 * 1024, `main.js is ${mainStats.size} bytes`);

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

test("loads local dictionaries on demand, retries missing files, and shares the Japanese engine", async (t) => {
  const main = await readFile("main.js", "utf8");
  const window = new Window();
  t.after(() => window.close());
  let missingDictionary = true;
  const fetches = [];
  const notices = [];
  const processors = new Map();
  const adapter = {
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
    const resource = new URL(url);
    assert.equal(resource.protocol, "app:");
    assert.equal(resource.host, "local");
    assert.ok(resource.pathname.startsWith("/.obsidian/plugins/big-characters/japanese-dictionary/"));
    const name = resource.pathname.split("/").at(-1);
    if (missingDictionary && name === "base.dat.gz") return new Response(null, { status: 404 });
    return new Response(await readFile(`japanese-dictionary/${name}`));
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
  assert.equal(plain.textContent, "日本語");
  assert.equal(fetches.length, 0);

  await assert.rejects(plugin.loadJapaneseEngine(), /Failed to load.*404/u);
  assert.equal(fetches.length, 12);
  assert.equal(notices.length, 1);
  await assert.rejects(plugin.loadJapaneseEngine(), /Failed to load.*404/u);
  assert.equal(fetches.length, 24);
  assert.equal(notices.length, 1, "repeated failures must not repeat the notice");
  missingDictionary = false;

  const romaji = window.document.createElement("div");
  const furigana = window.document.createElement("div");
  processors.get("ja-jp-romaji")("座って", romaji);
  processors.get("ja-jp-furigana")("食べる", furigana);
  await Promise.all([waitForProcessed(romaji), waitForProcessed(furigana)]);
  assert.equal(romaji.querySelector("rt")?.textContent, "suwatte");
  assert.equal(furigana.querySelector(".bc-base")?.textContent, "食");
  assert.equal(furigana.querySelector("rt")?.textContent, "た");
  assert.equal(fetches.length, 36, "concurrent renders must share one dictionary load");

  const cached = window.document.createElement("div");
  processors.get("ja-jp-romaji")("座って", cached);
  await waitForProcessed(cached);
  assert.equal(cached.querySelector("rt")?.textContent, "suwatte");
  assert.equal(fetches.length, 36, "subsequent renders must reuse the engine");
  assert.equal(notices.length, 1);
});
