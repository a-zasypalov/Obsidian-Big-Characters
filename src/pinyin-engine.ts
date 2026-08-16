import { addTraditionalDict, pinyin as convertToPinyin } from "pinyin-pro";
import traditionalDict from "@pinyin-pro/data/traditional";

// Traditional characters often need a different contextual pronunciation from
// their simplified counterparts (for example, 轉盤 is zhuàn pán). Register
// Pinyin Pro's official mapping once when the local engine loads, then always
// enable its Traditional Chinese lookup. Simplified Chinese continues to use
// the same engine and word segmentation.
addTraditionalDict(traditionalDict);

export function pinyin(text: string, options: { toneType: "symbol" }): string {
  return convertToPinyin(text, { ...options, traditional: true });
}
