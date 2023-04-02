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

export function renderInfo(info, content, type = "inline") {
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
    if (type == "block") {
      tag += `>\n${content}</${info.tag}>\n`;
    } else {
      tag += `>${content}</${info.tag}>`;
    }
  }
  return tag;
}
