import base from "@faanau/kuromoji/dict/base.dat.gz";
import cc from "@faanau/kuromoji/dict/cc.dat.gz";
import check from "@faanau/kuromoji/dict/check.dat.gz";
import tid from "@faanau/kuromoji/dict/tid.dat.gz";
import tidMap from "@faanau/kuromoji/dict/tid_map.dat.gz";
import tidPos from "@faanau/kuromoji/dict/tid_pos.dat.gz";
import unk from "@faanau/kuromoji/dict/unk.dat.gz";
import unkChar from "@faanau/kuromoji/dict/unk_char.dat.gz";
import unkCompat from "@faanau/kuromoji/dict/unk_compat.dat.gz";
import unkInvoke from "@faanau/kuromoji/dict/unk_invoke.dat.gz";
import unkMap from "@faanau/kuromoji/dict/unk_map.dat.gz";
import unkPos from "@faanau/kuromoji/dict/unk_pos.dat.gz";

export { createJapaneseEngine } from "./japanese-engine";

export const dictionaryVersion = "kuromoji-ipadic-0.2.1";
export const dictionaryFiles: Readonly<Record<string, Uint8Array>> = {
  "base.dat.gz": base,
  "cc.dat.gz": cc,
  "check.dat.gz": check,
  "tid.dat.gz": tid,
  "tid_map.dat.gz": tidMap,
  "tid_pos.dat.gz": tidPos,
  "unk.dat.gz": unk,
  "unk_char.dat.gz": unkChar,
  "unk_compat.dat.gz": unkCompat,
  "unk_invoke.dat.gz": unkInvoke,
  "unk_map.dat.gz": unkMap,
  "unk_pos.dat.gz": unkPos
};
