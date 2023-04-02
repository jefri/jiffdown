import { marked } from "marked";

export function parseInfo(info = "") {
  const spec = {
    id: undefined,
    tag: "",
    classes: [],
    attributes: {},
  };

  let idx = 0;
  let state = "tag";
  let attr = "";
  let value = "";

  function transition(next) {
    switch (state) {
      case "tag":
        if (!spec.tag) {
          spec.tag = value;
        }
        break;
      case "id":
        spec.id = value;
        break;
      case "class":
        spec.classes.push(value);
        break;
      case "attr":
        attr = value;
        break;
      case "val":
        spec.attributes[attr] = value;
        break;
    }
    value = "";
    state = next;
  }

  while (idx < info.length) {
    switch (info.charAt(idx)) {
      case "#":
        transition("id");
        break;
      case ".":
        transition("class");
        break;
      case "[":
        transition("attr");
        break;
      case "=":
        transition("val");
        break;
      case "]":
      case " ":
        transition("tag");
        break;
      default:
        value += info.charAt(idx);
        break;
    }
    idx += 1;
  }
  transition("end");

  spec.classes.sort();

  spec.tag = spec.tag || "span";

  return spec;
}

export function renderParseInfo(info, content) {
  let tag = "<" + info.tag;
  if (info.id) {
    tag += ` id="${info.id}"`;
  }
  if (info.classes.length > 0) {
    tag += ` class="${info.classes.join(" ")}"`;
  }
  const attrs = Object.entries(info.attributes);
  if (attrs.length > 0) {
    tag += " " + attrs.map(([k, v]) => `${k}="${v}"`).join(" ");
  }
  if (info.tag === "img") {
    tag += ` alt="${content}" />`;
  } else {
    tag += `>${content}</${info.tag}>`;
  }
  return tag;
}

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
      return renderParseInfo(token.info, this.parser.parseInline(token.tokens));
    }
    return false;
  },
};

export default INLINE;
