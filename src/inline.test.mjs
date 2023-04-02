import assert from "node:assert";
import { test } from "node:test";
import { parseInfo, renderParseInfo } from "./inline.mjs";

test("finds tag", () => {
  const spec = parseInfo("img");
  assert.equal(spec.tag, "img");
});

test("finds id", () => {
  const spec = parseInfo("#id");
  assert.equal(spec.id, "id");
});

test("finds classes", () => {
  const spec = parseInfo(".wide.bg");
  assert.deepStrictEqual(spec.classes, ["bg", "wide"]);
});

test("finds attributes", () => {
  const spec = parseInfo("[width=200px] [height=300px]");
  assert.deepStrictEqual(spec.attributes, {
    width: "200px",
    height: "300px",
  });
});

test("finds all", () => {
  const spec = parseInfo("img #id .wide [width=200px][height=300px]");
  assert.deepStrictEqual(spec, {
    tag: "img",
    id: "id",
    classes: ["wide"],
    attributes: { height: "300px", width: "200px" },
  });
});

test("finds all mixed up", () => {
  const spec = parseInfo(" #id.bg .wide [width=200px]img[height=300px]");
  assert.deepStrictEqual(spec, {
    tag: "img",
    id: "id",
    classes: ["bg", "wide"],
    attributes: { height: "300px", width: "200px" },
  });
});

test("accepts first found tag", () => {
  const spec = parseInfo("attr img");
  assert.equal(spec.tag, "attr");
});

test("img", () => {
  const rendered = renderParseInfo(
    {
      tag: "img",
      id: "id",
      classes: ["bg", "wide"],
      attributes: { height: "300px", width: "200px" },
    },
    "alt text"
  );

  assert.equal(
    rendered,
    `<img id="id" class="bg wide" height="300px" width="200px" alt="alt text" />`
  );
});

test("span", () => {
  const rendered = renderParseInfo(
    {
      tag: "span",
      id: "",
      classes: ["info"],
      attributes: {},
    },
    "Informative"
  );

  assert.equal(rendered, `<span class="info">Informative</span>`);
});
