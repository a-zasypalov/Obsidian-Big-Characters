// `zh` is the ISO 639-1 / BCP 47 language tag for Chinese.
export const CHINESE_MARKER_CLASS = "cg-zh";
export const PINYIN_MARKER_CLASS = "cg-zh-pinyin";
export const GUIDE_MARKER_SELECTOR = `span.${CHINESE_MARKER_CLASS}, span.${PINYIN_MARKER_CLASS}`;
export const PINYIN_MARKER_SELECTOR = `span.${PINYIN_MARKER_CLASS}`;
export const PINYIN_SPAN_OPENING = `<span class="${PINYIN_MARKER_CLASS}">`;
export const SPAN_CLOSING = "</span>";

const SPAN_TAG_PATTERN = /<\/?span\b[^>]*>/giu;
const CLASS_ATTRIBUTE_PATTERN =
  /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/iu;
const INLINE_MARKDOWN_PATTERN = /[*_`\[]|~{2}/u;
const ADJACENT_BOLD_ITALIC_PATTERN = /^\*\*([^*]+)\*\*\*([^*]+)\*/u;

export interface MarkerSentinel {
  id: number;
  openingTag: string;
  openingComment: string;
  closingComment: string;
}

export interface MarkerSourceTransform {
  markdown: string;
  markers: MarkerSentinel[];
  requiresMarkdownRender: boolean;
}

interface SpanStackEntry {
  marker?: MarkerSentinel;
  openingPartIndex: number;
  contentStart: number;
}

function openingTagHasClass(tag: string, className: string): boolean {
  if (/^<\//u.test(tag)) return false;

  const classValue = tag.match(CLASS_ATTRIBUTE_PATTERN)?.slice(1).find(Boolean);
  return classValue?.split(/\s+/u).includes(className) ?? false;
}

export function openingTagHasGuideClass(tag: string): boolean {
  return (
    openingTagHasClass(tag, CHINESE_MARKER_CLASS) ||
    openingTagHasClass(tag, PINYIN_MARKER_CLASS)
  );
}

export function openingTagHasPinyinMarkerClass(tag: string): boolean {
  return openingTagHasClass(tag, PINYIN_MARKER_CLASS);
}

function protectAdjacentBoldItalic(content: string): string {
  let result = "";
  let cursor = 0;
  let codeTicks = 0;

  while (cursor < content.length) {
    if (content[cursor] === "\\") {
      result += content.slice(cursor, cursor + 2);
      cursor += 2;
      continue;
    }

    if (content[cursor] === "`") {
      const ticks = content.slice(cursor).match(/^`+/u)?.[0] ?? "`";
      if (codeTicks === 0) codeTicks = ticks.length;
      else if (ticks.length === codeTicks) codeTicks = 0;
      result += ticks;
      cursor += ticks.length;
      continue;
    }

    if (codeTicks === 0) {
      const match = content.slice(cursor).match(ADJACENT_BOLD_ITALIC_PATTERN);
      if (match) {
        result += `<strong>${match[1]}</strong><em>${match[2]}</em>`;
        cursor += match[0].length;
        continue;
      }
    }

    result += content[cursor];
    cursor += 1;
  }

  return result;
}

export function protectGuideEmphasis(markdown: string): string {
  const spanPattern = /(<span\b[^>]*>)([\s\S]*?)(<\/span\s*>)/giu;
  return markdown.replace(spanPattern, (whole, openingTag: string, content: string, closingTag: string) => {
    if (!openingTagHasGuideClass(openingTag)) return whole;
    return `${openingTag}${protectAdjacentBoldItalic(content)}${closingTag}`;
  });
}

export function transformMarkerSource(markdown: string): MarkerSourceTransform {
  const markers: MarkerSentinel[] = [];
  const stack: SpanStackEntry[] = [];
  const parts: string[] = [];
  let cursor = 0;
  let requiresMarkdownRender = false;

  for (let match = SPAN_TAG_PATTERN.exec(markdown); match; match = SPAN_TAG_PATTERN.exec(markdown)) {
    const tag = match[0];
    parts.push(markdown.slice(cursor, match.index));
    cursor = match.index + tag.length;

    if (/^<\//u.test(tag)) {
      const opening = stack.pop();
      if (!opening?.marker) {
        parts.push(tag);
        continue;
      }

      const content = markdown.slice(opening.contentStart, match.index);
      requiresMarkdownRender ||= INLINE_MARKDOWN_PATTERN.test(content);
      parts.push(`<!--${opening.marker.closingComment}-->`);
      continue;
    }

    if (/\/\s*>$/u.test(tag)) {
      parts.push(tag);
      continue;
    }

    const openingPartIndex = parts.length;
    if (!openingTagHasGuideClass(tag)) {
      parts.push(tag);
      stack.push({ openingPartIndex, contentStart: cursor });
      continue;
    }

    const id = markers.length;
    const marker: MarkerSentinel = {
      id,
      openingTag: tag,
      openingComment: `cg-marker-open-${id}`,
      closingComment: `cg-marker-close-${id}`
    };
    markers.push(marker);
    parts.push(`<!--${marker.openingComment}-->`);
    stack.push({ marker, openingPartIndex, contentStart: cursor });
  }

  parts.push(markdown.slice(cursor));

  for (const opening of stack) {
    if (!opening.marker) continue;
    parts[opening.openingPartIndex] = opening.marker.openingTag;
    const markerIndex = markers.indexOf(opening.marker);
    if (markerIndex !== -1) markers.splice(markerIndex, 1);
  }

  return {
    markdown: parts.join(""),
    markers,
    requiresMarkdownRender: markers.length > 0 && requiresMarkdownRender
  };
}

function createMarkerElement(openingTag: string): HTMLSpanElement | null {
  const template = document.createElement("template");
  template.innerHTML = `${openingTag}</span>`;
  const marker = template.content.firstElementChild;
  return marker instanceof HTMLSpanElement ? marker : null;
}

export function restoreMarkerSpans(
  container: HTMLElement,
  transform: MarkerSourceTransform
): HTMLElement[] {
  const comments = new Map<string, Comment>();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    comments.set((node as Comment).data, node as Comment);
  }

  const restored: HTMLElement[] = [];
  for (const marker of [...transform.markers].reverse()) {
    const opening = comments.get(marker.openingComment);
    const closing = comments.get(marker.closingComment);
    const element = createMarkerElement(marker.openingTag);
    if (!opening || !closing || !element) continue;

    const range = document.createRange();
    range.setStartAfter(opening);
    range.setEndBefore(closing);

    try {
      range.surroundContents(element);
      opening.remove();
      closing.remove();
      restored.push(element);
    } catch {
      // A marker that crosses block boundaries remains readable, just without ruby.
    }
  }

  return restored;
}
