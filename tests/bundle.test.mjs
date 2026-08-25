import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

test("bundles both lazy pronunciation engines into the Community Plugin release file", async () => {
  const [main, mainStats] = await Promise.all([readFile("main.js", "utf8"), stat("main.js")]);

  assert.doesNotMatch(main, /pinyin-engine\.js/u);
  assert.doesNotMatch(main, /korean-engine\.js/u);
  assert.doesNotMatch(main, /document\.body/u);
  assert.match(main, /toneSandhi/u);
  assert.ok(mainStats.size > 200 * 1024, `main.js is unexpectedly small: ${mainStats.size} bytes`);
  assert.ok(mainStats.size < 550 * 1024, `main.js is ${mainStats.size} bytes`);

  await assert.rejects(stat("pinyin-engine.js"), { code: "ENOENT" });
  await assert.rejects(stat("korean-engine.js"), { code: "ENOENT" });
});

test("keeps fenced pronunciation blocks on the inline-block layout path", async () => {
  const css = await readFile("styles.css", "utf8");
  const rule = css.match(/\.bc-code-block\s*\{([^}]*)\}/u)?.[1] ?? "";

  // A display or margin override here re-collapses the block's margins with the
  // surrounding paragraph margins, which silently discards the spacing settings.
  assert.doesNotMatch(rule, /\b(display|margin)\b/u);
});
