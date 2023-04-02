import { marked } from "marked";

function parseInfo(info = "") {
  return {
    id: undefined,
    classes: [],
    attributes: {},
  };
}

/** @type {marked.TokenizerAndRendererExtension} */
const INLINE = {
  name: "inline",
  level: "inline",
  start: (src) => {
    return src.indexOf("{");
  },
  tokenizer: (src) => {
    const match = src.match(/^\{((?<info>[^:]+):)?(?<content>[^}]+)\}/);
    if (match) {
      return {
        type: "inline",
        raw: match[0],
        text: match.groups.content.trim(),
        info: parseInfo(match.groups.info),
      };
    } else {
      return false;
    }
  },
  renderer(token) {
    if (token.type === "inline") {
      return `<span>${token.text}</span>`;
    }
    return false;
  },
};

export default INLINE;
