const HANZI_PATTERN = /\p{Script=Han}+/gu;

export interface HanziTextSegment<T> {
  item: T;
  text: string;
  eligible: boolean;
}

export interface HanziRunPart<T> {
  item: T;
  start: number;
  text: string;
}

export interface HanziRun<T> {
  text: string;
  parts: HanziRunPart<T>[];
}

// Keep a Hanzi run intact when it crosses inline Markdown formatting. This
// lets the pinyin engine use phrase context for `妈妈回来**了**`, while a real
// character between runs (such as punctuation or code) still creates a break.
export function collectContiguousHanziRuns<T>(
  segments: readonly HanziTextSegment<T>[]
): HanziRun<T>[] {
  const runs: HanziRun<T>[] = [];
  let parts: HanziRunPart<T>[] = [];
  let text = "";

  const flush = (): void => {
    if (!parts.length) return;
    runs.push({ text, parts });
    parts = [];
    text = "";
  };

  for (const segment of segments) {
    if (!segment.eligible) {
      flush();
      continue;
    }

    let cursor = 0;
    HANZI_PATTERN.lastIndex = 0;
    for (let match = HANZI_PATTERN.exec(segment.text); match; match = HANZI_PATTERN.exec(segment.text)) {
      if (match.index > cursor) flush();

      const hanzi = match[0];
      parts.push({ item: segment.item, start: match.index, text: hanzi });
      text += hanzi;
      cursor = match.index + hanzi.length;
    }
    if (cursor < segment.text.length) flush();
  }

  flush();
  return runs;
}
