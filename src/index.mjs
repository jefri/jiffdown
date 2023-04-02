// @ts-check

import { marked } from "marked";
import inline from "./inline.mjs";
import blockInfo from "./block_info.mjs";
// import hljs from "highlight.js";

marked.use({
  extensions: [blockInfo, inline],
  // highlight: function (code, lang) {
  //   const language = hljs.getLanguage(lang) ? lang : "plaintext";
  //   return hljs.highlight(code, { language }).value;
  // },
  // langPrefix: "hljs language-", // highlight.js css expects a top-level 'hljs' class.
});

/** @param {string} md */
export function toHTML(md) {
  return marked(md);
}
