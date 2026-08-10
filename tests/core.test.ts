import assert from "node:assert/strict";
import test from "node:test";
import { BoundedStringCache } from "../src/bounded-cache";
import {
  CHINESE_MARKER_CLASS,
  PINYIN_MARKER_CLASS,
  openingTagHasPinyinMarkerClass,
  protectGuideEmphasis,
  transformMarkerSource
} from "../src/marker";
import { unwrapCompleteMarker, wrapSelection } from "../src/selection";

test("recognizes the marker class in any attribute order and class list", () => {
  const source = `<span data-topic="travel" class="note ${PINYIN_MARKER_CLASS}">**荷兰***要*</span>`;
  const transform = transformMarkerSource(source);

  assert.equal(transform.markers.length, 1);
  assert.equal(transform.markers[0].openingTag, `<span data-topic="travel" class="note ${PINYIN_MARKER_CLASS}">`);
  assert.equal(transform.requiresMarkdownRender, true);
  assert.match(transform.markdown, /<!--cg-marker-open-0-->/u);
  assert.match(transform.markdown, /<!--cg-marker-close-0-->/u);
});

test("passes Markdown formatting through unchanged for Obsidian to render", () => {
  const source = `<span class="${PINYIN_MARKER_CLASS}">**荷兰***要* \\*literal\\* \`代码\` [链接](https://example.com)</span>`;
  const transform = transformMarkerSource(source);

  assert.equal(transform.requiresMarkdownRender, true);
  assert.match(transform.markdown, /\*\*荷兰\*\*\*要\*/u);
  assert.match(transform.markdown, /\\\*literal\\\*/u);
  assert.match(transform.markdown, /`代码`/u);
  assert.match(transform.markdown, /\[链接\]\(https:\/\/example\.com\)/u);
});

test("does not alter a marker without Markdown and leaves malformed markers alone", () => {
  const plain = `<span class="${PINYIN_MARKER_CLASS}">要三小时。</span>`;
  const malformed = `<span class="${PINYIN_MARKER_CLASS}">要三小时。`;

  assert.equal(transformMarkerSource(plain).requiresMarkdownRender, false);
  assert.deepEqual(transformMarkerSource(malformed), {
    markdown: malformed,
    markers: [],
    requiresMarkdownRender: false
  });
});

test("wraps and unwraps a selected marker without changing its content", () => {
  const wrapped = wrapSelection("**要**");
  assert.equal(wrapped, `<span class="${PINYIN_MARKER_CLASS}">**要**</span>`);
  assert.equal(unwrapCompleteMarker(wrapped), "**要**");
  assert.equal(
    unwrapCompleteMarker(`<span data-kind="study" class="${PINYIN_MARKER_CLASS} extra">要</span>`),
    "要"
  );
  assert.equal(unwrapCompleteMarker("要"), null);
  assert.equal(unwrapCompleteMarker(`<span class="${CHINESE_MARKER_CLASS}">要</span>`), null);
});

test("recognizes cg-zh as a guide marker without treating it as a pinyin marker", () => {
  const opening = `<span class="${CHINESE_MARKER_CLASS}">`;
  assert.equal(openingTagHasPinyinMarkerClass(opening), false);
  assert.equal(transformMarkerSource(`${opening}**要**</span>`).markers.length, 1);
});

test("protects adjacent bold and italic markers inside guide spans", () => {
  const source = `<span class="${PINYIN_MARKER_CLASS}">我去**荷兰***要*三小时。</span>\n(Driving to **Netherlands** *takes* 3 hours.)`;
  const protectedSource = protectGuideEmphasis(source);

  assert.match(protectedSource, /我去<strong>荷兰<\/strong><em>要<\/em>三小时。/u);
  assert.match(protectedSource, /\*\*Netherlands\*\* \*takes\*/u);
  assert.equal(
    protectGuideEmphasis(`<span class="${PINYIN_MARKER_CLASS}">\`**荷兰***要*\`</span>`),
    `<span class="${PINYIN_MARKER_CLASS}">\`**荷兰***要*\`</span>`
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
