import assert from "node:assert";
import { test } from "node:test";
import image from "./image.mjs";

test("renders simple img", () => {
  const img = image.render.image("image.png", "", "image");
  assert.equal(img, `<img src="image.png" alt="image" />`);
});

test("renders image with only width", () => {
  const img = image.render.image("image.png", "=250", "image");
  assert.equal(img, `<img src="image.png" alt="image" width="250" />`);
});

test("renders image with only height", () => {
  const img = image.render.image("image.png", "=:250", "image");
  assert.equal(img, `<img src="image.png" alt="image" height="250" />`);
});

test("renders image with only title", () => {
  const img = image.render.image("image.png", "image", "image");
  assert.equal(img, `<img src="image.png" alt="image" title="image" />`);
});

test("renders image with only height and width in px and %", () => {
  const img = image.render.image("image.png", "=250px:15%", "image");
  assert.equal(
    img,
    `<img src="image.png" alt="image" width="250px" height="15%" />`
  );
});

test("renders image with height, width, and title", () => {
  const img = image.render.image("image.png", "=250px:15% title", "image");
  assert.equal(
    img,
    `<img src="image.png" alt="image" width="250px" height="15%" title="title" />`
  );
});
