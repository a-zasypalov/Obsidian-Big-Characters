import {
  openingTagHasPinyinMarkerClass,
  PINYIN_SPAN_OPENING,
  SPAN_CLOSING
} from "./marker";

export function wrapSelection(selection: string): string {
  return `${PINYIN_SPAN_OPENING}${selection}${SPAN_CLOSING}`;
}

export function unwrapCompleteMarker(selection: string): string | null {
  const opening = selection.match(/^<span\b[^>]*>/iu)?.[0];
  const closing = selection.match(/<\/span\s*>$/iu)?.[0];
  if (!opening || !closing || !openingTagHasPinyinMarkerClass(opening)) return null;

  return selection.slice(opening.length, -closing.length);
}
