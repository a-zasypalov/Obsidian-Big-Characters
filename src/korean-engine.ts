import { romanize } from "koroman";

export function romanizeKorean(text: string): string {
  return romanize(text, { usePronunciationRules: true, casingOption: "lowercase" });
}
