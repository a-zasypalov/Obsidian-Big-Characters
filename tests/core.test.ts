import assert from "node:assert/strict";
import test from "node:test";
import { BoundedStringCache } from "../src/bounded-cache";
import {
  CHINESE_MARKER_CLASS,
  CHINESE_PINYIN_MARKER_CLASS,
  extractMarkerContents,
  markerSpanOpening
} from "../src/marker";
import { unwrapCompleteMarker, wrapSelection } from "../src/selection";

test("extracts raw marker source verbatim, including the adjacent bold/italic regression", () => {
  const source = `我上个月开车去<span class="${CHINESE_PINYIN_MARKER_CLASS}">**荷兰***要*三小时。</span>`;
  const markers = extractMarkerContents(source);

  assert.equal(markers.length, 1);
  assert.equal(markers[0].pinyin, true);
  // The exact Markdown must survive untouched so Live Preview's parser can render it.
  assert.equal(markers[0].content, "**荷兰***要*三小时。");
});

test("extracts markers in document order and distinguishes pinyin from plain", () => {
  const source =
    `<span class="${CHINESE_MARKER_CLASS}">大字</span> and ` +
    `<span data-topic="travel" class="note ${CHINESE_PINYIN_MARKER_CLASS}">**荷兰**</span>`;
  const markers = extractMarkerContents(source);

  assert.deepEqual(markers, [
    { content: "大字", pinyin: false },
    { content: "**荷兰**", pinyin: true }
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
