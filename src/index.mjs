// @ts-check

import { marked } from "marked";
import inline from "./inline.mjs";
import blockInfo from "./block_info.mjs";
import entities from "./entities.mjs";
import references from "./references.mjs";
// import hljs from "highlight.js";

marked.use(references);
marked.use(blockInfo);
marked.use(inline);
marked.use(entities);

/** @param {string} md */
export function toHTML(md) {
  return marked(md);
}
