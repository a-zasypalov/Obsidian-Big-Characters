import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

test("bundles the lazy pinyin engine into the Community Plugin release file", async () => {
  const [main, mainStats] = await Promise.all([readFile("main.js", "utf8"), stat("main.js")]);

  assert.doesNotMatch(main, /pinyin-engine\.js/u);
  assert.doesNotMatch(main, /document\.body/u);
  assert.match(main, /toneSandhi/u);
  assert.ok(mainStats.size > 200 * 1024, `main.js is unexpectedly small: ${mainStats.size} bytes`);
  assert.ok(mainStats.size < 500 * 1024, `main.js is ${mainStats.size} bytes`);

  await assert.rejects(stat("pinyin-engine.js"), { code: "ENOENT" });
});
