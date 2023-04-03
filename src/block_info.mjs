import { marked } from "marked";
import { parseInfo, renderInfo } from "./info.mjs";

const TOKEN_TYPE = "block-info";

/** @type {marked.TokenizerAndRendererExtension} */
const BLOCK_INFO = {
  name: TOKEN_TYPE,
  level: "block",
  start(src) {
    return src.match(/>[ \t]?{/)?.index;
  },
  tokenizer(src) {
    const match = src.match(
      /^(?<leader> *>[ \t]?\{(?<info>[^}]+)\}).*(?:\n\n|$)?/
    );
    if (match) {
      const text = src
        .replace(match.groups?.leader, "")
        .replace(/^ *>[ \t]?/gm, "")
        .trim();
      const token = {
        type: TOKEN_TYPE,
        raw: match[0],
        tokens: [],
        text,
        info: parseInfo(match.groups.info),
      };
      this.lexer.blockTokens(token.text, token.tokens);
      return token;
    }
    return false;
  },
  renderer(token) {
    return renderInfo(token.info, this.parser.parse(token.tokens), "block");
  },
};

export default { extensions: [BLOCK_INFO] };
