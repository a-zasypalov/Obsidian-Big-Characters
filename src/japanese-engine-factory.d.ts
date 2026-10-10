declare module "virtual:japanese-engine" {
  import type { JapaneseEngine } from "./japanese-engine";

  export interface JapaneseEngineBundle {
    createJapaneseEngine(dictionaryPath: string): Promise<JapaneseEngine>;
  }

  export function loadJapaneseEngine(): JapaneseEngineBundle;
}
