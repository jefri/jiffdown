import assert from "node:assert";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf-8"));

// The published entry point (`package.json` "main") must expose the full
// extension set. The image extension is the discriminator: it turns
// `{.float}` info into a class attribute, which plain marked does not.
test("published main entry wires the image extension", async () => {
  const main = pathToFileURL(resolve(root, pkg.main)).href;
  const { toHTML } = await import(main);

  const html = toHTML("![{.float} Cat](cat.png)");

  assert.match(html, /class="float"/);
});
