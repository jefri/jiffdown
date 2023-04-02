// @ts-check

import { marked } from "marked";
import inline from "./inline.mjs";

marked.use({ extensions: [inline] });

/** @param {string} md */
export function toHTML(md) {
  return marked(md);
}
