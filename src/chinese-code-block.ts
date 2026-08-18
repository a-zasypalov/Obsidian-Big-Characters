import { CHINESE_MARKER_CLASS, CHINESE_PINYIN_MARKER_CLASS, type GuideMarkerClass } from "./marker";

export const CHINESE_CODE_BLOCK_LANGUAGES = ["zh-cn", "zh-cn-pinyin"] as const;
export type ChineseCodeBlockLanguage = (typeof CHINESE_CODE_BLOCK_LANGUAGES)[number];
export const CHINESE_PINYIN_CODE_BLOCK_SELECTOR = `.bc-code-block.${CHINESE_PINYIN_MARKER_CLASS}`;

export function codeBlockClass(language: ChineseCodeBlockLanguage): GuideMarkerClass {
  return language === "zh-cn-pinyin" ? CHINESE_PINYIN_MARKER_CLASS : CHINESE_MARKER_CLASS;
}
