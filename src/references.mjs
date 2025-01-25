import Slugger from "github-slugger";

/** @type {Map<string, string>} */
const REFERENCES = new Map();
/** @type {Set<string>} */
const MOVED = new Set();

function findReference(name) {
  MOVED.add(name);
  return REFERENCES.get(name);
}

const ReferencesName = "references";
/** @type {import("marked").TokenizerAndRendererExtension} */
const References = {
  name: ReferencesName,
  level: "inline",
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
    const reference = findReference(token.reference.replace("#", ""));
    if (reference) {
      const tokens =
        reference.type === "section" ? reference.tokens : [reference];
      return this.parser.parse(tokens);
    } else {
      return this.parser.parse(token.tokens ?? []);
    }
  },
};

const SectionsName = "section";
/** @type {import("marked").RendererExtension} */
const Sections = {
  name: SectionsName,
  renderer(token) {
    if (token.type === SectionsName && !MOVED.has(token.id)) {
      return `<section>\n${this.parser.parse(token.tokens)}</section>\n`;
    }
    return "";
  },
};

export function replaceWalkTokens(marked) {
  REFERENCES.clear();
  MOVED.clear();
  const _walkTokens = marked.walkTokens;
  marked.walkTokens = function walkTokensToBuildSections(tokens, callback) {
    const slugger = new Slugger();
    const values = _walkTokens.call(marked, tokens, callback);

    /** @type {marked.Token[]} */
    const stack = [];

    let i = 0;
    function popSection() {
      const section = stack.pop();
      if (stack.length > 0) {
        stack.at(-1).tokens.push(section);
      } else {
        tokens.splice(section.pos, i - section.pos, section);
        i = section.pos + 1;
      }
    }

    for (; i < tokens.length; i++) {
      const token = tokens[i];
      const pushSection = () => {
        const id = slugger.slug(token.id ?? token.text);
        const section = {
          type: SectionsName,
          id,
          pos: i,
          depth: token.depth,
          tokens: [],
        };
        REFERENCES.set(id, section);
        stack.push(section);
        token.id = section.id;
        return section;
      };

      if (token.type === "heading") {
        while (token.depth <= stack.at(-1)?.depth) {
          popSection();
        }
        let section = pushSection();
        section.tokens.push(token);
      } else if (token.type == "block-info" && token.info.tag == "section") {
        // A section block-info starts a new section at the current depth
        token.depth = (stack.at(-1)?.depth ?? 0) + 1;
        if (stack.length > 0) {
          popSection();
        }
        pushSection();
      } else if (stack.length > 0) {
        stack.at(-1).tokens.push(token);
      }
    }

    while (stack.length > 0) {
      popSection();
    }

    return values;
  };
}

export default {
  name: "references",
  renderer: {
    heading(token) {
      const { tokens, depth } = token;
      const text = this.parser.parseInline(tokens);
      let id = token.id ? `id="${token.id}"` : "";
      return `<h${depth} ${id}>${text}</h${depth}>\n`;
    },
  },
  extensions: [Sections, References],
  walkTokens(token) {
    if (token.id) {
      REFERENCES.set(token.id, token);
    }
  },
};
