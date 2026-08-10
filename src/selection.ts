import { openingTagHasMarkerClass, SPAN_CLOSING, SPAN_OPENING } from "./marker";

export function wrapSelection(selection: string): string {
  return `${SPAN_OPENING}${selection}${SPAN_CLOSING}`;
}

export function unwrapCompleteMarker(selection: string): string | null {
  const opening = selection.match(/^<span\b[^>]*>/iu)?.[0];
  const closing = selection.match(/<\/span\s*>$/iu)?.[0];
  if (!opening || !closing || !openingTagHasMarkerClass(opening)) return null;

  return selection.slice(opening.length, -closing.length);
}
