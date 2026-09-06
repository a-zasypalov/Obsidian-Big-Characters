declare module "kuroshiro" {
  interface KuroshiroUtil {
    kanaToHiragna(text: string): string;
    kanaToRomaji(text: string, system: "hepburn"): string;
  }

  export default class Kuroshiro {
    static readonly Util: KuroshiroUtil;
  }
}
