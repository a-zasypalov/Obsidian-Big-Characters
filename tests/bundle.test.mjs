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
  assert.fail("Pronunciation did not finish rendering");
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

async function createPluginFixture(t) {
  const main = await readFile("main.js", "utf8");
  const window = new Window();
  t.after(() => window.close());
  const dictionaryState = { missing: false };
  const fetches = [];
  const notices = [];
  const processors = new Map();
  const postprocessors = [];
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
    registerMarkdownPostProcessor(handler) { postprocessors.push(handler); }
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
    if (dictionaryState.missing && name === "base.dat.gz") return new Response(null, { status: 404 });
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
  return { plugin, window, processors, postprocessors, fetches, notices, dictionaryState };
}

test("loads local dictionaries on demand, retries missing files, and shares the Japanese engine", async (t) => {
  const { plugin, window, processors, fetches, notices, dictionaryState } = await createPluginFixture(t);
  dictionaryState.missing = true;
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
  dictionaryState.missing = false;

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


test("export can await pronunciation, including a cold Japanese dictionary load", async (t) => {
  for (const path of ["inline", "fenced"]) {
    await t.test(path, async (t) => {
      const { window, processors, postprocessors, fetches } = await createPluginFixture(t);
      const element = window.document.createElement("div");
      let completion;
      if (path === "inline") {
        element.innerHTML = '<span class="bc-ja-jp-romaji"><strong>座*</strong>って*</span>' +
          '<span class="bc-ja-jp-furigana"><strong>食*</strong>べる*</span>';
        completion = postprocessors[0](element, { getSectionInfo: () => null });
      } else {
        completion = processors.get("ja-jp-romaji")("**座***って*", element);
      }
      assert.equal(typeof completion?.then, "function", "Obsidian must receive the rendering promise");
      await completion;
      assert.deepEqual([...element.querySelectorAll("rt")].map((rt) => rt.textContent),
        path === "inline" ? ["suwatte", "た"] : ["suwatte"]);
      assert.equal(fetches.length, 12, "concurrent markers must share one dictionary load");
    });
  }
});

test("renders emphasis in every mode through inline and fenced rendering paths", async (t) => {
  const { plugin, window, processors, postprocessors, notices } = await createPluginFixture(t);
  const cases = [
    ["zh-cn", "你好", "世界"],
    ["zh-cn-pinyin", "你好", "世界"],
    ["ko-kr", "같이", "먹어요"],
    ["ko-kr-rom", "같이", "먹어요"],
    ["ja-jp", "日本語", "勉強"],
    ["ja-jp-romaji", "日本語", "勉強"],
    ["ja-jp-furigana", "日本語", "勉強"]
  ];
  for (const [language, first, second] of cases) {
    // Export fixtures captured from Obsidian 1.14.4's bundled Markdown parser.
    for (const [source, expected, bold, italic, parsedHTML] of [
      [`**${first}***${second}*`, first + second, first, second, `<strong>${first}*</strong>${second}*`],
      [`*${first}***${second}**`, first + second, second, first, `*${first}<strong>*${second}</strong>`],
      [`*${first} **${second}** ${first}*`, `${first} ${second} ${first}`, second, `${first} ${second} ${first}`, `<em>${first} <strong>${second}</strong> ${first}</em>`],
      [`**${first} *${second}* ${first}**`, `${first} ${second} ${first}`, `${first} ${second} ${first}`, second, `<strong>${first} <em>${second}</em> ${first}</strong>`],
      [`***${first}***${second}`, first + second, first, first, `<strong><em>${first}</em></strong>${second}`]
    ]) {
      for (const path of ["fenced", "reading-whole-note", "reading-section", "reading-export", "live-preview"]) {
        await t.test(`${language}: ${source} (${path})`, async () => {
          const element = window.document.createElement("div");
          let marker = element;
          if (path === "fenced") {
            processors.get(language)(source, element);
          } else {
            marker = window.document.createElement("span");
            marker.className = `bc-${language}`;
            if (path === "reading-export") marker.innerHTML = parsedHTML;
            else marker.textContent = source;
            element.append(marker);
            if (path.startsWith("reading")) {
              const raw = `<span class="bc-${language}">${source}</span>`;
              await postprocessors[0](element, {
                getSectionInfo: () => path === "reading-export" ? null : ({
                  text: path === "reading-section" ? raw : `Earlier paragraph\n${raw}`,
                  lineStart: 1,
                  lineEnd: 1
                })
              });
            } else {
              plugin.renderLivePreviewRoot(element);
            }
          }
          if (["zh-cn-pinyin", "ko-kr-rom", "ja-jp-romaji", "ja-jp-furigana"].includes(language)) {
            await waitForProcessed(marker);
          }
          const clone = marker.cloneNode(true);
          for (const annotation of clone.querySelectorAll("rt")) annotation.remove();
          assert.equal(clone.textContent, expected);
          for (const [selector, expectedText] of [["strong", bold], ["em", italic]]) {
            const walker = window.document.createTreeWalker(clone, window.NodeFilter.SHOW_TEXT);
            let actual = "";
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              if (node.parentElement?.closest(selector)) actual += node.textContent;
            }
            assert.equal(actual, expectedText);
          }
        });
      }
    }
  }

  await t.test("Reading View fallback merges fragmented emphasis text", () => {
    const marker = window.document.createElement("span");
    marker.className = "bc-zh-cn";
    marker.innerHTML = "<strong>荷兰</strong>";
    for (const part of ["*", "要", "*"]) marker.append(window.document.createTextNode(part));
    postprocessors[0](marker, { getSectionInfo: () => null });
    assert.equal(marker.innerHTML, "<strong>荷兰</strong><em>要</em>");
  });

  await t.test("plain fenced emphasis works when pronunciation settings are disabled", () => {
    plugin.settings.showPinyinInReadingView = false;
    const element = window.document.createElement("div");
    processors.get("ja-jp-furigana")("**食***べる*", element);
    assert.equal(element.innerHTML, "<strong>食</strong><em>べる</em>");
    assert.equal(element.querySelector("ruby"), null);
    plugin.settings.showPinyinInReadingView = true;
  });

  await t.test("Reading View preserves existing HTML emphasis", async () => {
    const marker = window.document.createElement("span");
    marker.className = "bc-ja-jp-romaji";
    marker.innerHTML = "<strong>座</strong><em>って</em>";
    postprocessors[0](marker, {
      getSectionInfo: () => ({
        text: '<span class="bc-ja-jp-romaji"><strong>座</strong><em>って</em></span>',
        lineStart: 0,
        lineEnd: 0
      })
    });
    await waitForProcessed(marker);
    assert.equal(marker.querySelector("rt")?.textContent, "suwatte");
    assert.equal(marker.querySelector("strong")?.textContent, "座");
    assert.equal(marker.querySelector("em")?.textContent, "って");
  });

  for (const [language, source, expected] of [
    ["ko-kr-rom", "같**이** 백*마*", ["gachi", "baengma"]],
    ["ja-jp-romaji", "日**本***語* **座***って* **食***べる*", ["nihongo", "suwatte", "taberu"]],
    ["ja-jp-furigana", "日**本***語* **座***って* **食***べる*", ["にほんご", "すわ", "た"]]
  ]) {
    for (const path of ["fenced", "reading", "reading-export", "live-preview"]) {
      await t.test(`${language} preserves word readings across formatting (${path})`, async () => {
        const element = window.document.createElement("div");
        let marker = element;
        if (path === "fenced") processors.get(language)(source, element);
        else {
          marker = window.document.createElement("span");
          marker.className = `bc-${language}`;
          if (path === "reading-export") {
            marker.innerHTML = language === "ko-kr-rom"
              ? "같<strong>이</strong> 백<em>마</em>"
              : "日<strong>本*</strong>語* <strong>座*</strong>って* <strong>食*</strong>べる*";
          } else marker.textContent = source;
          element.append(marker);
          if (path.startsWith("reading")) await postprocessors[0](element, {
            getSectionInfo: () => path === "reading-export" ? null : ({ text: `<span class="bc-${language}">${source}</span>`, lineStart: 0, lineEnd: 0 })
          });
          else plugin.renderLivePreviewRoot(element);
        }
        await waitForProcessed(marker);
        assert.deepEqual([...marker.querySelectorAll("rt")].map((rt) => rt.textContent), expected);
        assert.ok(marker.querySelector("strong"));
        assert.ok(marker.querySelector("em"));
        assert.doesNotMatch(marker.textContent, /\*/u);
      });
    }
  }
  assert.deepEqual(notices, []);
});
