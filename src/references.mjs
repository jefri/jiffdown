import Slugger from "github-slugger";

/** @type {Map<string, any>} */
const REFERENCES = new Map();
/** @type {Set<string>} */
const MOVED = new Set();
/**
 * Ids whose referenced content is currently being rendered. Guards against a
 * section that references itself (`> {section #a}` containing `&{#a};`), which
 * would otherwise re-parse its own tokens without bound.
 * @type {Set<string>}
 */
const RENDERING = new Set();

function findReference(name) {
  MOVED.add(name);
  return REFERENCES.get(name);
}

const ReferencesInlineName = "references-inline"; // was "references"
/** @type {import("marked").TokenizerAndRendererExtension} */
const References = {
  name: ReferencesInlineName,
  level: "inline",
  start(src) {
    return src.indexOf("&{");
  },
  tokenizer(src) {
    const match = src.match(/^&\{(?<ref>[^}]+)};/);
    if (match) {
      return {
        type: ReferencesInlineName,
        raw: match[0],
        reference: match.groups.ref,
      };
    }
    return false;
  },
  renderer(token) {
    const name = token.reference.replace("#", "");
    // A reference encountered while its own content is rendering is
    // self-referential; emit nothing to break the recursion.
    if (RENDERING.has(name)) {
      return "";
    }
    const reference = findReference(name);
    const tokens =
      reference ?
        (reference.type === "section" ? reference.tokens : [reference]) : [];
    RENDERING.add(name);
    try {
      return this.parser.parse(tokens);
    } finally {
      RENDERING.delete(name);
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

const ReferencesBlockName = "references-block"; // was "references"

/**
 * preprocess hook — runs once at the start of every marked.parse().
 * Clears module-level REFERENCES (Map) and MOVED (Set) so reference state
 * never leaks between parses. Replaces the per-call reset formerly performed
 * at the top of replaceWalkTokens.
 * @param {string} markdown
 * @returns {string}
 */
function preprocess(markdown) {
  REFERENCES.clear();
  MOVED.clear();
  RENDERING.clear();
  return markdown;
}

/**
 * Recursively register every token carrying an `id` into REFERENCES.
 * Replicates the former extension `walkTokens` callback. It MUST run before
 * the section stack algorithm: that algorithm reassigns `token.id` on section
 * roots (to `#slug`), and references like `&{#section-ref};` resolve against
 * the original block-info `id`, so the map entry has to be keyed before the
 * id is overwritten.
 * @param {import("marked").Token[]} tokens
 */
function registerIds(tokens) {
  for (const token of tokens) {
    if (token.id) {
      REFERENCES.set(token.id, token);
    }
    if (Array.isArray(token.tokens)) {
      registerIds(token.tokens);
    }
    if (Array.isArray(token.items)) {
      registerIds(token.items);
    }
  }
}

/**
 * processAllTokens hook — receives the full top-level token list after
 * tokenization and returns it restructured, with `section` tokens built
 * around headings and `block-info` sections. Body is the stack algorithm
 * formerly run inside the walkTokens closure.
 * Invariants:
 *  - REFERENCES is populated with every section id BEFORE any inline
 *    reference renderer runs (so &{ref}; can resolve).
 *  - MOVED records ids relocated into a parent section, so the `section`
 *    renderer does not double-emit a section that was nested.
 * @param {import("marked").Token[]} tokens
 * @returns {import("marked").Token[]}
 */
function processAllTokens(tokens) {
  registerIds(tokens);

  const slugger = new Slugger();

  /** @type {any[]} */
  const stack = [];

  let i = 0;
  function popSection() {
    const section = stack.pop();
    if (!section) return;
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
      // Headings carry no id yet, so slug their text; block-info section
      // markers already carry their declared id (e.g. `#section-ref`), which
      // is what inline references resolve against, so reuse it.
      const id =
        token.id ?? slugger.slug(token.raw.replace(/^#+[\s\t]+/, ""));
      const section = {
        type: SectionsName,
        id,
        start: i,
        depth: token.depth,
        tokens: [token],
      };
      REFERENCES.set(id, section);
      stack.push(section);
      token.id = id;
      return section;
    };

    if (token.type === "heading") {
      while (stack.at(-1) && token.depth <= stack.at(-1).depth) {
        popSection();
      }
      pushSection();
    } else if (token.type === "block-info" && token.info.tag === "section") {
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

  return tokens;
}

export default {
  name: ReferencesBlockName,
  hooks: { preprocess, processAllTokens },
  renderer: {
    heading(token) {
      const { tokens, depth } = token;
      const text = this.parser.parseInline(tokens);
      let id = token.id ? `id="${token.id}"` : "";
      return `<h${depth} ${id}>${text}</h${depth}>\n`;
    },
  },
  extensions: [Sections, References],
};
