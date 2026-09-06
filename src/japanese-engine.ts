import { builder, type IpadicFeatures, type Tokenizer } from "@faanau/kuromoji";
import Kuroshiro from "kuroshiro";

export type JapaneseMode = "romaji" | "furigana";

export interface JapaneseAnnotation {
  start: number;
  end: number;
  annotation: string;
}

export interface JapaneseEngine {
  annotate(text: string, mode: JapaneseMode): JapaneseAnnotation[];
}

interface PositionedToken {
  start: number;
  surface: string;
  pronunciation: string | undefined;
  reading: string | undefined;
  pos: string;
}

const HAN_PATTERN = /\p{Script=Han}+/gu;
const HAS_HAN_PATTERN = /\p{Script=Han}/u;
const JAPANESE_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/u;
const KANA_PATTERN = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function positionedTokens(tokens: readonly IpadicFeatures[]): PositionedToken[] {
  let start = 0;
  return tokens.map((token) => {
    const positioned = {
      start,
      surface: token.surface_form,
      pronunciation: token.pronunciation ?? token.reading,
      reading: token.reading,
      pos: token.pos
    };
    start += token.surface_form.length;
    return positioned;
  });
}

function mergeTrailingSmallTsu(tokens: readonly PositionedToken[]): PositionedToken[] {
  const merged: PositionedToken[] = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if (next && /[っッ]$/u.test(token.surface) && /^(動詞|形容詞)$/u.test(token.pos)) {
      merged.push({
        ...token,
        surface: token.surface + next.surface,
        pronunciation: token.pronunciation && next.pronunciation
          ? token.pronunciation + next.pronunciation
          : undefined,
        reading: token.reading && next.reading ? token.reading + next.reading : undefined
      });
      index += 1;
    } else {
      merged.push(token);
    }
  }

  return merged;
}

function romajiAnnotations(tokens: readonly IpadicFeatures[]): JapaneseAnnotation[] {
  const annotations: JapaneseAnnotation[] = [];

  for (const token of mergeTrailingSmallTsu(positionedTokens(tokens))) {
    if (!JAPANESE_PATTERN.test(token.surface)) continue;
    const pronunciation = token.pronunciation ?? (KANA_PATTERN.test(token.surface) ? token.surface : "");
    if (!pronunciation) continue;

    const annotation = Kuroshiro.Util.kanaToRomaji(pronunciation, "hepburn");
    if (!annotation || JAPANESE_PATTERN.test(annotation)) continue;
    annotations.push({
      start: token.start,
      end: token.start + token.surface.length,
      annotation
    });
  }

  return annotations;
}

export function alignFurigana(
  surface: string,
  readingText: string,
  start: number
): JapaneseAnnotation[] {
  if (!HAS_HAN_PATTERN.test(surface)) return [];
  const reading = Kuroshiro.Util.kanaToHiragna(readingText);
  const kanjiRuns = [...surface.matchAll(HAN_PATTERN)];

  if (kanjiRuns.length === 1 && kanjiRuns[0][0] === surface) {
    return [{ start, end: start + surface.length, annotation: reading }];
  }

  let surfaceCursor = 0;
  let pattern = "^";
  for (const run of kanjiRuns) {
    const runStart = run.index;
    pattern += escapeRegExp(Kuroshiro.Util.kanaToHiragna(surface.slice(surfaceCursor, runStart)));
    pattern += "(.+?)";
    surfaceCursor = runStart + run[0].length;
  }
  pattern += escapeRegExp(Kuroshiro.Util.kanaToHiragna(surface.slice(surfaceCursor))) + "$";

  const match = reading.match(new RegExp(pattern, "u"));
  if (!match) return [];
  return kanjiRuns.map((run, index) => ({
    start: start + run.index,
    end: start + run.index + run[0].length,
    annotation: match[index + 1]
  }));
}

function furiganaAnnotations(tokens: readonly IpadicFeatures[]): JapaneseAnnotation[] {
  const annotations: JapaneseAnnotation[] = [];
  for (const token of positionedTokens(tokens)) {
    if (token.reading) annotations.push(...alignFurigana(token.surface, token.reading, token.start));
  }
  return annotations;
}

export function createJapaneseEngine(dictionaryPath: string): Promise<JapaneseEngine> {
  return new Promise((resolve, reject) => {
    builder({ dicPath: dictionaryPath }).build((error, tokenizer: Tokenizer) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        annotate(text, mode) {
          const tokens = tokenizer.tokenize(text);
          return mode === "romaji" ? romajiAnnotations(tokens) : furiganaAnnotations(tokens);
        }
      });
    });
  });
}
