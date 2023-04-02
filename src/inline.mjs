import { marked } from "marked";
import { parseInfo, renderInfo } from "./info.mjs";

/** @type {marked.TokenizerAndRendererExtension} */
const INLINE = {
  name: "inline",
  level: "inline",
  start(src) {
    return src.indexOf("{");
  },
  tokenizer(src) {
    const match = src.match(/^\{((?<info>[^:]+):)?(?<content>[^}]+)\}/);
    if (match) {
      const text = match.groups.content.trim();
      const innerTokens = this.lexer.inlineTokens(text);
      return {
        type: "inline",
        raw: match[0],
        text,
        tokens: innerTokens,
        info: parseInfo(match.groups.info),
      };
    } else {
      return false;
    }
  },
  renderer(token) {
    if (token.type === "inline") {
      return renderInfo(token.info, this.parser.parseInline(token.tokens));
    }
    return false;
  },
};

export default INLINE;
