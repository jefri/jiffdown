// @ts-check

import { Marked } from "marked";

import blockInfo from "./src/block_info.mjs";
import entities from "./src/entities.mjs";
import image from "./src/image.mjs";
import inline from "./src/inline.mjs";
import references, { replaceWalkTokens } from "./src/references.mjs";
// import hljs from "highlight.js";

const marked = new Marked();
replaceWalkTokens(marked);
marked.use(references);
marked.use(blockInfo);
marked.use(inline);
marked.use(image);
marked.use(entities);

/** @param {string} md */
export function toHTML(md) {
  return marked.parse(md);
}
