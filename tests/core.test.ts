import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";
import { BoundedCache } from "../src/bounded-cache";
import {
  CODE_BLOCK_LANGUAGES,
  PRONUNCIATION_CODE_BLOCK_SELECTOR,
  codeBlockClass
} from "../src/chinese-code-block";
import {
  CHINESE_MARKER_CLASS,
  CHINESE_PINYIN_MARKER_CLASS,
  KOREAN_MARKER_CLASS,
  KOREAN_ROM_MARKER_CLASS,
  JAPANESE_MARKER_CLASS,
  JAPANESE_ROMAJI_MARKER_CLASS,
  JAPANESE_FURIGANA_MARKER_CLASS,
  extractMarkerContents,
  markerSpanOpening,
  pronunciationKind
} from "../src/marker";
import { collectContiguousHanziRuns } from "../src/hanzi-runs";
import { romanizeKorean } from "../src/korean-engine";
import { pinyin } from "../src/pinyin-engine";
import { unwrapCompleteMarker, wrapSelection } from "../src/selection";
import { alignFurigana, createJapaneseEngine } from "../src/japanese-engine";
import { ensureJapaneseDictionary } from "../src/japanese-dictionary";
import { applyJapaneseRuby, removeRubyAnnotations } from "../src/japanese-ruby";

test("maps all fenced-block languages to their display modes", () => {
  assert.deepEqual(CODE_BLOCK_LANGUAGES, [
    "zh-cn",
    "zh-cn-pinyin",
    "ko-kr",
    "ko-kr-rom",
    "ja-jp",
    "ja-jp-romaji",
    "ja-jp-furigana"
  ]);
  assert.equal(codeBlockClass("zh-cn"), CHINESE_MARKER_CLASS);
  assert.equal(codeBlockClass("zh-cn-pinyin"), CHINESE_PINYIN_MARKER_CLASS);
  assert.equal(codeBlockClass("ko-kr"), KOREAN_MARKER_CLASS);
  assert.equal(codeBlockClass("ko-kr-rom"), KOREAN_ROM_MARKER_CLASS);
  assert.equal(codeBlockClass("ja-jp"), JAPANESE_MARKER_CLASS);
  assert.equal(codeBlockClass("ja-jp-romaji"), JAPANESE_ROMAJI_MARKER_CLASS);
  assert.equal(codeBlockClass("ja-jp-furigana"), JAPANESE_FURIGANA_MARKER_CLASS);
  assert.equal(
    PRONUNCIATION_CODE_BLOCK_SELECTOR,
    ".bc-code-block.bc-zh-cn-pinyin, .bc-code-block.bc-ko-kr-rom, " +
      ".bc-code-block.bc-ja-jp-romaji, .bc-code-block.bc-ja-jp-furigana"
  );
});

test("extracts raw marker source verbatim, including the adjacent bold/italic regression", () => {
  const source = `我上个月开车去<span class="${CHINESE_PINYIN_MARKER_CLASS}">**荷兰***要*三小时。</span>`;
  const markers = extractMarkerContents(source);

  assert.equal(markers.length, 1);
  assert.equal(markers[0].markerClass, CHINESE_PINYIN_MARKER_CLASS);
  // The exact Markdown must survive untouched so Live Preview's parser can render it.
  assert.equal(markers[0].content, "**荷兰***要*三小时。");
});

test("extracts markers in document order and retains their exact marker class", () => {
  const source =
    `<span class="${CHINESE_MARKER_CLASS}">大字</span> and ` +
    `<span data-topic="travel" class="note ${CHINESE_PINYIN_MARKER_CLASS}">**荷兰**</span> and ` +
    `<span class="${KOREAN_ROM_MARKER_CLASS}">같이</span> and ` +
    `<span class="${JAPANESE_ROMAJI_MARKER_CLASS}">座って</span> and ` +
    `<span class="${JAPANESE_FURIGANA_MARKER_CLASS}">食べる</span>`;
  const markers = extractMarkerContents(source);

  assert.deepEqual(markers, [
    { content: "大字", markerClass: CHINESE_MARKER_CLASS },
    { content: "**荷兰**", markerClass: CHINESE_PINYIN_MARKER_CLASS },
    { content: "같이", markerClass: KOREAN_ROM_MARKER_CLASS },
    { content: "座って", markerClass: JAPANESE_ROMAJI_MARKER_CLASS },
    { content: "食べる", markerClass: JAPANESE_FURIGANA_MARKER_CLASS }
  ]);
});

test("ignores non-guide spans and malformed markers", () => {
  assert.deepEqual(extractMarkerContents(`<span class="other">要</span>`), []);
  assert.deepEqual(extractMarkerContents(`<span class="${CHINESE_PINYIN_MARKER_CLASS}">要`), []);
});

test("wraps and unwraps a selected marker without changing its content", () => {
  const wrapped = wrapSelection("**要**", CHINESE_PINYIN_MARKER_CLASS);
  assert.equal(wrapped, `<span class="${CHINESE_PINYIN_MARKER_CLASS}">**要**</span>`);
  assert.equal(unwrapCompleteMarker(wrapped, CHINESE_PINYIN_MARKER_CLASS), "**要**");
  assert.equal(
    unwrapCompleteMarker(
      `<span data-kind="study" class="${CHINESE_PINYIN_MARKER_CLASS} extra">要</span>`,
      CHINESE_PINYIN_MARKER_CLASS
    ),
    "要"
  );
  assert.equal(unwrapCompleteMarker("要", CHINESE_PINYIN_MARKER_CLASS), null);
  assert.equal(
    unwrapCompleteMarker(`<span class="${CHINESE_MARKER_CLASS}">要</span>`, CHINESE_PINYIN_MARKER_CLASS),
    null
  );
  assert.equal(
    wrapSelection("要", CHINESE_MARKER_CLASS),
    `<span class="${CHINESE_MARKER_CLASS}">要</span>`
  );
  assert.equal(
    markerSpanOpening(CHINESE_MARKER_CLASS),
    `<span class="${CHINESE_MARKER_CLASS}">`
  );
  assert.equal(
    wrapSelection("같이", KOREAN_ROM_MARKER_CLASS),
    `<span class="${KOREAN_ROM_MARKER_CLASS}">같이</span>`
  );
  assert.equal(
    unwrapCompleteMarker(`<span class="${KOREAN_MARKER_CLASS}">같이</span>`, KOREAN_MARKER_CLASS),
    "같이"
  );
  assert.equal(
    wrapSelection("座って", JAPANESE_ROMAJI_MARKER_CLASS),
    `<span class="${JAPANESE_ROMAJI_MARKER_CLASS}">座って</span>`
  );
  assert.equal(
    wrapSelection("日本語", JAPANESE_MARKER_CLASS),
    `<span class="${JAPANESE_MARKER_CLASS}">日本語</span>`
  );
  assert.equal(
    unwrapCompleteMarker(
      `<span class="${JAPANESE_FURIGANA_MARKER_CLASS}">食べる</span>`,
      JAPANESE_FURIGANA_MARKER_CLASS
    ),
    "食べる"
  );
  assert.equal(pronunciationKind(JAPANESE_ROMAJI_MARKER_CLASS), "japanese-romaji");
  assert.equal(pronunciationKind(JAPANESE_FURIGANA_MARKER_CLASS), "furigana");
  assert.equal(pronunciationKind(JAPANESE_MARKER_CLASS), null);
});

test("keeps only the newest values in the bounded pronunciation cache", () => {
  const cache = new BoundedCache<string>(2);
  cache.set("要", "yào");
  cache.set("荷兰", "hè lán");
  cache.set("三", "sān");

  assert.equal(cache.get("要"), undefined);
  assert.equal(cache.get("荷兰"), "hè lán");
  assert.equal(cache.get("三"), "sān");
});

test("keeps phrase context across bold and italic text nodes", () => {
  const runs = collectContiguousHanziRuns([
    { item: "plain", text: "妈妈回来", eligible: true },
    { item: "bold", text: "了", eligible: true },
    { item: "punctuation", text: "。", eligible: false },
    { item: "italic", text: "我们", eligible: true }
  ]);

  assert.deepEqual(runs, [
    {
      text: "妈妈回来了",
      parts: [
        { item: "plain", start: 0, text: "妈妈回来" },
        { item: "bold", start: 0, text: "了" }
      ]
    },
    { text: "我们", parts: [{ item: "italic", start: 0, text: "我们" }] }
  ]);
  assert.equal(pinyin(runs[0].text, { toneType: "symbol" }), "mā ma huí lái le");
});

test("uses Pinyin Pro's Traditional Chinese dictionary for contextual pronunciation", () => {
  assert.equal(pinyin("一個轉盤", { toneType: "symbol" }), "yí gè zhuàn pán");
  assert.equal(pinyin("一個转盘", { toneType: "symbol" }), "yí gè zhuàn pán");
});

test("uses the local Korean engine's pronunciation rules", () => {
  assert.equal(romanizeKorean("한글"), "hangeul");
  assert.equal(romanizeKorean("같이"), "gachi");
  assert.equal(romanizeKorean("백마"), "baengma");
});

test("uses contextual Japanese readings and keeps furigana off kana", async () => {
  const engine = await createJapaneseEngine("node_modules/@faanau/kuromoji/dict");

  assert.deepEqual(engine.annotate("座って", "romaji"), [
    { start: 0, end: 3, annotation: "suwatte" }
  ]);
  assert.deepEqual(engine.annotate("食べる", "furigana"), [
    { start: 0, end: 1, annotation: "た" }
  ]);
  assert.deepEqual(engine.annotate("今日", "furigana"), [
    { start: 0, end: 2, annotation: "きょう" }
  ]);
  assert.deepEqual(engine.annotate("取り戻す", "furigana"), [
    { start: 0, end: 1, annotation: "と" },
    { start: 2, end: 3, annotation: "もど" }
  ]);
  assert.deepEqual(engine.annotate("ひらがな", "furigana"), []);
  assert.deepEqual(engine.annotate("𠮷", "furigana"), []);
  assert.deepEqual(engine.annotate("𠮷食べる", "furigana"), [
    { start: 2, end: 3, annotation: "た" }
  ]);

  const kanaRomaji = engine.annotate("ひらがな カタカナ。", "romaji");
  assert.equal(kanaRomaji.map((part) => part.annotation).join(""), "hiraganakatakana");
  assert.ok(kanaRomaji.every((part) => part.end <= 9));
});

test("omits furigana when a mixed kanji and kana reading cannot be aligned", () => {
  assert.deepEqual(alignFurigana("食べる", "ヨメナイ", 0), []);
});

test("applies Japanese ruby across formatting and removes it without changing markup", () => {
  const window = new Window();
  const previous = {
    document: globalThis.document,
    Node: globalThis.Node,
    Element: globalThis.Element
  };
  Object.assign(globalThis, {
    document: window.document,
    Node: window.Node,
    Element: window.Element
  });

  try {
    const marker = window.document.createElement("span") as unknown as HTMLElement;
    marker.innerHTML = "日<strong>本</strong><em>語</em>";
    const original = marker.innerHTML;

    applyJapaneseRuby(marker, () => [{ start: 0, end: 3, annotation: "にほんご" }]);
    assert.equal(marker.querySelector("rt")?.textContent, "にほんご");
    assert.equal(marker.querySelector(".bc-base")?.innerHTML, original);

    removeRubyAnnotations(marker);
    assert.equal(marker.innerHTML, original);
  } finally {
    Object.assign(globalThis, previous);
    window.close();
  }
});

test("writes the Japanese dictionary marker last and retries partial extraction", async () => {
  const files = {
    "base.dat.gz": new Uint8Array([1]),
    "check.dat.gz": new Uint8Array([2])
  };
  const existing = new Set<string>();
  const writes: string[] = [];
  let failOnce = true;
  const adapter = {
    async exists(path: string) {
      return existing.has(path);
    },
    async mkdir(path: string) {
      existing.add(path);
    },
    async write(path: string) {
      writes.push(path);
      existing.add(path);
    },
    async writeBinary(path: string) {
      writes.push(path);
      if (failOnce && path.endsWith("check.dat.gz")) {
        failOnce = false;
        throw new Error("interrupted");
      }
      existing.add(path);
    }
  };

  await assert.rejects(
    ensureJapaneseDictionary(adapter, ".obsidian/plugins/big-characters", "v1", files)
  );
  const directory = await ensureJapaneseDictionary(
    adapter,
    ".obsidian/plugins/big-characters",
    "v1",
    files
  );
  assert.equal(directory, ".obsidian/plugins/big-characters/japanese-dictionary/v1");
  assert.ok(writes.at(-1)?.endsWith("/.complete"));

  const writesAfterCompletion = writes.length;
  await ensureJapaneseDictionary(adapter, ".obsidian/plugins/big-characters", "v1", files);
  assert.equal(writes.length, writesAfterCompletion);
});
