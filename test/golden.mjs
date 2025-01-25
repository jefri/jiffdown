import assert from "assert";
import { readdirSync, readFileSync } from "fs";
import test from "node:test";
import { dirname, join, resolve } from "path";
import { toHTML } from "../index.mjs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../golden");

readdirSync(root).map((dir) => {
  test(`Golden: ${dir}`, async () => {
    const mdFile = join(root, dir, `${dir}.md`);
    const goldenFile = join(root, dir, `${dir}.html`);

    const [md, golden] = await Promise.all([
      readFileSync(mdFile, { encoding: "utf-8" }),
      readFileSync(goldenFile, { encoding: "utf-8" }),
    ]);

    const html = toHTML(md);

    assert.strictEqual(html, golden);
  });
});
