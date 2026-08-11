import {
  type GuideMarkerClass,
  markerSpanOpening,
  openingTagHasClass,
  SPAN_CLOSING
} from "./marker";

export function wrapSelection(selection: string, markerClass: GuideMarkerClass): string {
  return `${markerSpanOpening(markerClass)}${selection}${SPAN_CLOSING}`;
}

export function unwrapCompleteMarker(
  selection: string,
  markerClass: GuideMarkerClass
): string | null {
  const opening = selection.match(/^<span\b[^>]*>/iu)?.[0];
  const closing = selection.match(/<\/span\s*>$/iu)?.[0];
  if (!opening || !closing || !openingTagHasClass(opening, markerClass)) return null;

  return selection.slice(opening.length, -closing.length);
}
