import {
  CHINESE_MARKER_CLASS,
  CHINESE_PINYIN_MARKER_CLASS,
  KOREAN_MARKER_CLASS,
  KOREAN_ROM_MARKER_CLASS,
  type GuideMarkerClass
} from "./marker";

export const CODE_BLOCK_LANGUAGES = ["zh-cn", "zh-cn-pinyin", "ko-kr", "ko-kr-rom"] as const;
export type CodeBlockLanguage = (typeof CODE_BLOCK_LANGUAGES)[number];
export const PRONUNCIATION_CODE_BLOCK_SELECTOR = [
  `.bc-code-block.${CHINESE_PINYIN_MARKER_CLASS}`,
  `.bc-code-block.${KOREAN_ROM_MARKER_CLASS}`
].join(", ");

export function codeBlockClass(language: CodeBlockLanguage): GuideMarkerClass {
  switch (language) {
    case "zh-cn":
      return CHINESE_MARKER_CLASS;
    case "zh-cn-pinyin":
      return CHINESE_PINYIN_MARKER_CLASS;
    case "ko-kr":
      return KOREAN_MARKER_CLASS;
    case "ko-kr-rom":
      return KOREAN_ROM_MARKER_CLASS;
  }
}
