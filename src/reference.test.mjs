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

test("three sibling sections each keep their content", () => {
  // Regression: the section stack dropped the content of the third sibling
  // section onward. Each `> {section}` marker opens a sibling section at the
  // same depth, so all three must render with their paragraph.
  const result = toHTML(
    `> {section #a}\n\nAyy\n\n> {section #b}\n\nBee\n\n> {section #c}\n\nCee`
  );

  assert.equal(
    result,
    `<section>\n<p>Ayy</p>\n</section>\n<section>\n<p>Bee</p>\n</section>\n<section>\n<p>Cee</p>\n</section>\n`
  );
});

test("reference suppresses its target regardless of document order", () => {
  // Section A is the target; sibling section B references it. The standalone
  // A must be suppressed even though A renders before the reference in B.
  const after = toHTML(
    `> {section #a}\n\nContent A\n\n> {section #b}\n\nSee &{#a};`
  );
  const before = toHTML(
    `> {section #b}\n\nSee &{#a};\n\n> {section #a}\n\nContent A`
  );

  assert.equal(after, before);
  // The reference is hoisted out of the host paragraph: "See " and the
  // referenced "Content A" render as sibling paragraphs, never nested.
  assert.equal(
    after,
    `<section>\n<p>See </p>\n<p>Content A</p>\n</section>\n`
  );
});

test("inline reference inside a paragraph hoists block content to siblings", () => {
  // A `<p>` may not contain a `<p>` (WHATWG: p content model is phrasing
  // content; a `<p>` start tag closes any open `<p>`). Rendering the resolved
  // block content inline produced `<p>See <p>Content A</p></p>`, which a browser
  // reparses into three detached siblings. Hoist the block content out of the
  // host paragraph so the serialization matches that DOM: text-before, the
  // referenced block, text-after, each its own sibling.
  const result = toHTML(
    `> {section #a}\n\nContent A\n\n> {section #b}\n\nSee &{#a}; for more details`
  );

  assert.equal(
    result,
    `<section>\n<p>See </p>\n<p>Content A</p>\n<p> for more details</p>\n</section>\n`
  );
});

test("multiple references in one paragraph each hoist in place", () => {
  // Two references with surrounding text split the host paragraph into four
  // siblings; both targets are suppressed standalone and rendered at the
  // reference site, in order.
  const result = toHTML(
    `> {section #a}\n\nAyy\n\n> {section #b}\n\nBee\n\n> {section #c}\n\n&{#a}; and &{#b}; done`
  );

  assert.equal(
    result,
    `<section>\n<p>Ayy</p>\n<p> and </p>\n<p>Bee</p>\n<p> done</p>\n</section>\n`
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
