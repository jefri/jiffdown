import { marked } from "marked";
import HTML_ENTITIES from "./known_entities.json" assert { type: "json" };

function isHtmlEntity(name) {
  return HTML_ENTITIES[`&${name};`] !== undefined;
}

const KNOWN_ENTITIES = new Map();

const RegisterEntitiesName = "register-entities";

/** @type {marked.TokenizerAndRendererExtension} */
const RegisterEntities = {
  name: RegisterEntitiesName,
  level: "inline",
  start(src) {
    src.indexOf("&");
  },
  tokenizer(src) {
    const match = src.match(/^&(?<name>[^:]+):(?<value>[^;]+);/);
    if (match) {
      const { name, value } = match.groups;
      if (isHtmlEntity(name)) return false;
      KNOWN_ENTITIES.set(name, value.trim());
      return {
        type: RegisterEntitiesName,
        raw: match[0],
      };
    }
    return false;
  },
  renderer() {
    return "";
  },
};

const LookupEntitiesName = "lookup-entities";
/** @type {marked.TokenizerAndRendererExtension} */
const LookupEntites = {
  name: LookupEntitiesName,
  level: "inline",
  start(src) {
    return src.indexOf("&");
  },
  tokenizer(src) {
    const match = src.match(/^&(?<name>[^:;]+);/);
    if (match) {
      const { name } = match.groups;
      if (isHtmlEntity(name)) return false;
      return {
        type: LookupEntitiesName,
        raw: match[0],
        name,
      };
    }
    return false;
  },
  renderer(token) {
    return KNOWN_ENTITIES.get(token.name) ?? token.name;
  },
};

export default {
  extensions: [RegisterEntities, LookupEntites],
};
