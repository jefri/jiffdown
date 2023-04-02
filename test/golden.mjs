import assert from "assert";
import { readdir, readFile } from "fs/promises";
import test from "node:test";
import { dirname, join, resolve } from "path";
import { toHTML } from "../src/index.mjs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../golden");

await Promise.all(
  (
    await readdir(root)
  ).map((dir) => {
    test(`Golden: ${dir}`, async () => {
      const mdFile = join(root, dir, `${dir}.md`);
      const goldenFile = join(root, dir, `${dir}.html`);

      const [md, golden] = await Promise.all([
        readFile(mdFile, { encoding: "utf-8" }),
        readFile(goldenFile, { encoding: "utf-8" }),
      ]);

      const html = toHTML(md);

      assert.strictEqual(html, golden);
    });
  })
);
