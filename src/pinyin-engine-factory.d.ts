declare module "virtual:pinyin-engine" {
  export function createPinyinEngine(): (text: string, options: { toneType: "symbol" }) => string;
}
