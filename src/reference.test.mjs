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

test("self-referential section does not recurse unbounded", () => {
  const md = `> {section #a}\n\nSelf reference: &{#a};`;

  let result;
  assert.doesNotThrow(() => {
    result = toHTML(md);
  });

  // The recursive reference contributes nothing; the surrounding text remains.
  assert.match(result, /Self reference:/);
});
