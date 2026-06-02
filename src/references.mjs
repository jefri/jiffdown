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
  return REFERENCES.get(name);
}

/** @param {import("marked").Token} token */
function refName(token) {
  return token.reference.replace("#", "");
}

/**
 * The block tokens a reference resolves to: a section's children, a bare
 * referenced token, or nothing when the id is unknown. Shared by the inline
 * renderer and the paragraph hoist so both resolve a reference identically.
 * @param {string} name
 * @returns {import("marked").Token[]}
 */
function resolveTokens(name) {
  const reference = findReference(name);
  if (!reference) return [];
  return reference.type === SectionsName ? reference.tokens : [reference];
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
    const name = refName(token);
    // A reference encountered while its own content is rendering is
    // self-referential; emit nothing to break the recursion.
    if (RENDERING.has(name)) {
      return "";
    }
    RENDERING.add(name);
    try {
      return this.parser.parse(resolveTokens(name));
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
 * Walk the restructured token tree and record into MOVED every section id that
 * is referenced from OUTSIDE its own subtree. Running this after sectioning,
 * before any rendering, makes suppression independent of document order: a
 * `&{#id};` placed after its target section suppresses the standalone section
 * just as one placed before it would.
 *
 * `sectionStack` is the chain of enclosing section ids. A reference whose
 * target is one of its ancestors is self-referential (degenerate) and must NOT
 * move the section, otherwise a section that only references itself would
 * vanish entirely. Traverses nested `tokens`, list `items`, and table
 * `header`/`rows` cells so references buried in those structures are seen.
 * @param {import("marked").Token[]} tokens
 * @param {string[]} sectionStack
 */
function recordMoved(tokens, sectionStack) {
  for (const token of tokens) {
    if (token.type === ReferencesInlineName) {
      const target = token.reference.replace("#", "");
      if (!sectionStack.includes(target)) {
        MOVED.add(target);
      }
    }
    const childStack =
      token.type === SectionsName ?
        [...sectionStack, token.id]
      : sectionStack;
    if (Array.isArray(token.tokens)) {
      recordMoved(token.tokens, childStack);
    }
    if (Array.isArray(token.items)) {
      recordMoved(token.items, childStack);
    }
    if (Array.isArray(token.header)) {
      recordMoved(token.header, childStack);
    }
    if (Array.isArray(token.rows)) {
      for (const row of token.rows) {
        recordMoved(row, childStack);
      }
    }
  }
}

/**
 * A `references-inline` token is hoistable when its target is a genuine
 * cross-reference: registered, and recorded in MOVED (referenced from outside
 * its own subtree). Self-references are never in MOVED, so they are left to the
 * inline renderer's recursion guard, which emits nothing.
 * @param {import("marked").Token} token
 */
function isHoistable(token) {
  if (token.type !== ReferencesInlineName) return false;
  const name = refName(token);
  return MOVED.has(name) && REFERENCES.has(name);
}

/**
 * Split a paragraph around every hoistable reference it contains. Runs of
 * ordinary inline tokens become their own `paragraph`; each reference is
 * replaced by the block tokens it resolves to (a section's child tokens, or a
 * bare referenced token). The result is a flat list of block tokens with no
 * reference left inside an inline position.
 * @param {import("marked").Token} paragraph
 * @returns {import("marked").Token[]}
 */
function splitParagraph(paragraph) {
  /** @type {import("marked").Token[]} */
  const out = [];
  /** @type {import("marked").Token[]} */
  let run = [];
  const flush = () => {
    if (run.length === 0) return;
    out.push({ type: "paragraph", raw: "", text: "", tokens: run });
    run = [];
  };
  for (const inline of paragraph.tokens) {
    if (isHoistable(inline)) {
      flush();
      out.push(...resolveTokens(refName(inline)));
    } else {
      run.push(inline);
    }
  }
  flush();
  return out;
}

/**
 * After sectioning, hoist block content referenced from inside a paragraph out
 * to sibling block tokens. A `<p>` may not contain block content (WHATWG: the
 * p element's content model is phrasing content; a `<p>` start tag closes any
 * open `<p>`), so rendering a section reference inline produced
 * `<p>See <p>Content A</p></p>` — which a browser reparses into detached
 * siblings. Splitting the host paragraph emits those siblings directly, so the
 * serialization matches the DOM a browser would build.
 *
 * Only `paragraph` tokens are split, and recursion descends into `section`
 * tokens only. References in list items and table cells are not wrapped in a
 * `paragraph`, and block content is valid flow content there, so those are left
 * to the inline renderer unchanged.
 * @param {import("marked").Token[]} tokens
 */
function hoistReferences(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === SectionsName && Array.isArray(token.tokens)) {
      hoistReferences(token.tokens);
    }
    if (
      token.type !== "paragraph" ||
      !Array.isArray(token.tokens) ||
      !token.tokens.some(isHoistable)
    ) {
      continue;
    }
    const replacement = splitParagraph(token);
    tokens.splice(i, 1, ...replacement);
    i += replacement.length - 1;
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
 *  - MOVED records every section referenced from outside itself, so the
 *    `section` renderer suppresses the standalone copy regardless of whether
 *    the reference appears before or after the target in document order.
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
      // Replace the span this section consumed (marker through the token
      // before the current index) with the single section token. deleteCount
      // is the span length `i - section.start`, not the absolute index `i`:
      // for any section past the first, `i` would delete trailing siblings,
      // including the marker currently being processed.
      tokens.splice(section.start, i - section.start, section);
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

  recordMoved(tokens, []);
  hoistReferences(tokens);

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
