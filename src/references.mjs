import { marked } from "marked";

const REFERENCES = new Map();
const MOVED = new Set();

function findReference(name) {
  MOVED.add(name);
  return REFERENCES.get(name);
}

const ReferencesName = "references";
/** @type {marked.TokenizerAndRendererExtension} */
const References = {
  name: ReferencesName,
  level: "block",
  start(src) {
    return src.indexOf("&{");
  },
  tokenizer(src) {
    const match = src.match(/^&\{(?<ref>[^}]+)};/);
    if (match) {
      return {
        type: ReferencesName,
        raw: match[0],
        reference: match.groups.ref,
      };
    }
    return false;
  },
  renderer(token) {
    const reference = findReference(token.reference);
    const tokens =
      reference.type === "section" ? reference.tokens : [reference];
    return this.parser.parse(tokens);
  },
};

const SectionsName = "section";
/** @type {marked.RendererExtension} */
const Sections = {
  name: SectionsName,
  renderer(token) {
    if (MOVED.has(token.id)) return "";
    return `<section>\n${this.parser.parse(token.tokens)}</section>\n`;
  },
};

const _walkTokens = marked.walkTokens;
marked.walkTokens = function walkTokensToBuildSections(tokens, callback) {
  const values = _walkTokens.call(marked, tokens, callback);

  /** @type {marked.Token[]} */
  const stack = [];

  let i = 0;
  function popSection() {
    const section = stack.pop();
    if (stack.length > 0) {
      stack.at(-1).tokens.push(section);
    } else {
      tokens.splice(section.start, i, section);
      i = section.start + 1;
    }
  }

  for (; i < tokens.length; i++) {
    const token = tokens[i];
    const pushSection = () => {
      const id =
        "#" + new marked.Slugger().slug(token.raw.replace(/^#+[\s\t]+/, ""));
      const section = {
        type: "section",
        id,
        start: i,
        depth: token.depth,
        tokens: [token],
      };
      REFERENCES.set(id, section);
      stack.push(section);
    };

    if (token.type === "heading") {
      if (stack.length === 0) {
        pushSection(token);
      } else if (token.depth > stack.at(-1).depth) {
        pushSection(token);
      } else {
        popSection();
        pushSection(token);
      }
    } else if (stack.length > 0) {
      stack.at(-1).tokens.push(token);
    }
  }

  while (stack.length > 0) {
    popSection();
  }

  return values;
};

function walkTokens(token) {
  if (token.id) {
    REFERENCES.set(token.id, token);
  }
}

export default {
  extensions: [Sections, References],
  walkTokens,
};
