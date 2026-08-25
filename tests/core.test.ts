import assert from "node:assert/strict";
import test from "node:test";
import { BoundedStringCache } from "../src/bounded-cache";
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
  extractMarkerContents,
  markerSpanOpening
} from "../src/marker";
import { collectContiguousHanziRuns } from "../src/hanzi-runs";
import { romanizeKorean } from "../src/korean-engine";
import { pinyin } from "../src/pinyin-engine";
import { unwrapCompleteMarker, wrapSelection } from "../src/selection";

test("maps Chinese and Korean fenced-block languages to their display modes", () => {
  assert.deepEqual(CODE_BLOCK_LANGUAGES, ["zh-cn", "zh-cn-pinyin", "ko-kr", "ko-kr-rom"]);
  assert.equal(codeBlockClass("zh-cn"), CHINESE_MARKER_CLASS);
  assert.equal(codeBlockClass("zh-cn-pinyin"), CHINESE_PINYIN_MARKER_CLASS);
  assert.equal(codeBlockClass("ko-kr"), KOREAN_MARKER_CLASS);
  assert.equal(codeBlockClass("ko-kr-rom"), KOREAN_ROM_MARKER_CLASS);
  assert.equal(
    PRONUNCIATION_CODE_BLOCK_SELECTOR,
    ".bc-code-block.bc-zh-cn-pinyin, .bc-code-block.bc-ko-kr-rom"
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
    `<span class="${KOREAN_ROM_MARKER_CLASS}">같이</span>`;
  const markers = extractMarkerContents(source);

  assert.deepEqual(markers, [
    { content: "大字", markerClass: CHINESE_MARKER_CLASS },
    { content: "**荷兰**", markerClass: CHINESE_PINYIN_MARKER_CLASS },
    { content: "같이", markerClass: KOREAN_ROM_MARKER_CLASS }
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
});

test("keeps only the newest values in the bounded pronunciation cache", () => {
  const cache = new BoundedStringCache(2);
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
