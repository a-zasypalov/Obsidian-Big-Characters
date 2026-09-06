declare module "virtual:japanese-engine" {
  import type { JapaneseEngine } from "./japanese-engine";

  export interface JapaneseEngineBundle {
    readonly dictionaryVersion: string;
    readonly dictionaryFiles: Readonly<Record<string, Uint8Array>>;
    createJapaneseEngine(dictionaryPath: string): Promise<JapaneseEngine>;
  }

  export function loadJapaneseEngine(): JapaneseEngineBundle;
}
