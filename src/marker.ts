// `zh-cn` identifies Chinese as used in mainland China.
export const CHINESE_MARKER_CLASS = "bc-zh-cn";
export const CHINESE_PINYIN_MARKER_CLASS = "bc-zh-cn-pinyin";
export type GuideMarkerClass = typeof CHINESE_MARKER_CLASS | typeof CHINESE_PINYIN_MARKER_CLASS;
export const GUIDE_MARKER_SELECTOR = `span.${CHINESE_MARKER_CLASS}, span.${CHINESE_PINYIN_MARKER_CLASS}`;
export const CHINESE_PINYIN_MARKER_SELECTOR = `span.${CHINESE_PINYIN_MARKER_CLASS}`;
export const SPAN_CLOSING = "</span>";

const SPAN_PATTERN = /(<span\b[^>]*>)([\s\S]*?)(<\/span\s*>)/giu;
const CLASS_ATTRIBUTE_PATTERN =
  /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/iu;

export interface MarkerSource {
  content: string;
  pinyin: boolean;
}

export function openingTagHasClass(tag: string, className: GuideMarkerClass): boolean {
  if (/^<\//u.test(tag)) return false;

  const classValue = tag.match(CLASS_ATTRIBUTE_PATTERN)?.slice(1).find(Boolean);
  return classValue?.split(/\s+/u).includes(className) ?? false;
}

export function openingTagHasGuideClass(tag: string): boolean {
  return (
    openingTagHasClass(tag, CHINESE_MARKER_CLASS) ||
    openingTagHasClass(tag, CHINESE_PINYIN_MARKER_CLASS)
  );
}

export function markerSpanOpening(className: GuideMarkerClass): string {
  return `<span class="${className}">`;
}

// Reading View mangles Markdown emphasis inside raw HTML spans, so we render the
// marker contents ourselves from the original source instead of trusting the DOM.
// Returns each guide marker's raw inner Markdown, in document order.
export function extractMarkerContents(source: string): MarkerSource[] {
  const markers: MarkerSource[] = [];
  for (const match of source.matchAll(SPAN_PATTERN)) {
    if (!openingTagHasGuideClass(match[1])) continue;
    markers.push({
      content: match[2],
      pinyin: openingTagHasClass(match[1], CHINESE_PINYIN_MARKER_CLASS)
    });
  }
  return markers;
}
