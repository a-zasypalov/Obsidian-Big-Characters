import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

test("keeps the pinyin dictionary out of the startup bundle", async () => {
  const [main, engine] = await Promise.all([
    readFile("main.js", "utf8"),
    readFile("pinyin-engine.js", "utf8")
  ]);
  const [mainStats, engineStats] = await Promise.all([stat("main.js"), stat("pinyin-engine.js")]);

  assert.match(main, /pinyin-engine\.js/u);
  assert.doesNotMatch(main, /DoubleUnicodePrefixReg/u);
  assert.doesNotMatch(main, /document\.body/u);
  assert.match(engine, /CharactersPronunciationPinyin/u);
  assert.ok(mainStats.size < 100 * 1024, `main.js is ${mainStats.size} bytes`);
  assert.ok(engineStats.size > 200 * 1024, `pinyin-engine.js is ${engineStats.size} bytes`);

  const sandbox = {};
  runInNewContext(engine, sandbox);
  assert.equal(sandbox.CharactersPronunciationPinyin.pinyin("要", { toneType: "symbol" }), "yào");
});
