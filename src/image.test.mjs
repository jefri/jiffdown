import assert from "node:assert";
import { test } from "node:test";
import image from "./image.mjs";

test("renders simple img", () => {
  const img = image.renderer.image({ href: "image.png", text: "image" });
  assert.equal(img, `<img src="image.png" alt="image" />`);
});

test("renders image with only width", () => {
  const img = image.renderer.image({
    href: "image.png",
    text: "{[width=250]} image",
  });
  assert.equal(img, `<img src="image.png" alt="image" width="250" />`);
});

test("renders image with only height", () => {
  const img = image.renderer.image({
    href: "image.png",
    text: "{[height=250]} image",
  });
  assert.equal(img, `<img src="image.png" alt="image" height="250" />`);
});

test("renders image with only title", () => {
  const img = image.renderer.image({ href: "image.png", text: "image" });
  assert.equal(img, `<img src="image.png" alt="image" />`);
});

test("renders image with only height and width in px and %", () => {
  const img = image.renderer.image({
    href: "image.png",
    text: "{[width=250px][height=15%]} image",
  });
  assert.equal(
    img,
    `<img src="image.png" alt="image" width="250px" height="15%" />`
  );
});

test("renders image with height, width, and title", () => {
  const img = image.renderer.image({
    href: "image.png",
    text: "{[width=250px][height=15%]} title",
  });
  assert.equal(
    img,
    `<img src="image.png" alt="title" width="250px" height="15%" />`
  );
});

test("adds classes from info", () => {
  const img = image.renderer.image({
    href: "image.png",
    text: "{.float.left} title",
  });
  assert.equal(img, `<img src="image.png" class="float left" alt="title" />`);
});