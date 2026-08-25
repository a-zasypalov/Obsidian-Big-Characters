// `zh-cn` identifies Chinese as used in mainland China.
export const CHINESE_MARKER_CLASS = "bc-zh-cn";
export const CHINESE_PINYIN_MARKER_CLASS = "bc-zh-cn-pinyin";
export const KOREAN_MARKER_CLASS = "bc-ko-kr";
export const KOREAN_ROM_MARKER_CLASS = "bc-ko-kr-rom";
export const GUIDE_MARKER_CLASSES = [
  CHINESE_PINYIN_MARKER_CLASS,
  KOREAN_ROM_MARKER_CLASS,
  CHINESE_MARKER_CLASS,
  KOREAN_MARKER_CLASS
] as const;
export type GuideMarkerClass = (typeof GUIDE_MARKER_CLASSES)[number];
export type PronunciationKind = "pinyin" | "rom";
export const GUIDE_MARKER_SELECTOR = GUIDE_MARKER_CLASSES.map((className) => `span.${className}`).join(
  ", "
);
export const CHINESE_PINYIN_MARKER_SELECTOR = `span.${CHINESE_PINYIN_MARKER_CLASS}`;
export const KOREAN_ROM_MARKER_SELECTOR = `span.${KOREAN_ROM_MARKER_CLASS}`;
export const SPAN_CLOSING = "</span>";

const SPAN_PATTERN = /(<span\b[^>]*>)([\s\S]*?)(<\/span\s*>)/giu;
const CLASS_ATTRIBUTE_PATTERN =
  /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/iu;

export interface MarkerSource {
  content: string;
  markerClass: GuideMarkerClass;
}

export function openingTagHasClass(tag: string, className: GuideMarkerClass): boolean {
  if (/^<\//u.test(tag)) return false;

  const classValue = tag.match(CLASS_ATTRIBUTE_PATTERN)?.slice(1).find(Boolean);
  return classValue?.split(/\s+/u).includes(className) ?? false;
}

export function openingTagHasGuideClass(tag: string): boolean {
  return guideMarkerClass(tag) !== null;
}

export function guideMarkerClass(tag: string): GuideMarkerClass | null {
  return GUIDE_MARKER_CLASSES.find((className) => openingTagHasClass(tag, className)) ?? null;
}

export function pronunciationKind(markerClass: GuideMarkerClass): PronunciationKind | null {
  if (markerClass === CHINESE_PINYIN_MARKER_CLASS) return "pinyin";
  if (markerClass === KOREAN_ROM_MARKER_CLASS) return "rom";
  return null;
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
    const markerClass = guideMarkerClass(match[1]);
    if (!markerClass) continue;
    markers.push({
      content: match[2],
      markerClass
    });
  }
  return markers;
}
