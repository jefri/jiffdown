import assert from "node:assert";
import { test } from "node:test";
import { toHTML } from "../index.mjs";

const MD = `> {section #section-ref-1}

Section Content-1

> {section #section-ref-2}

Section Content-2`;

test("section stack", () => {
  const result = toHTML(MD);

  assert.equal(
    result,
    `<section>\n<p>Section Content-1</p>\n</section>\n<section>\n<p>Section Content-2</p>\n</section>\n`
  );
});
