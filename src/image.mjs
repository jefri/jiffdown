import { parseInfo } from "./info.mjs";

/**
 * Process an inline image with the format `![Alt Text][src "=size title"]`.
 * Title can start with size as `=[width]:[height] `, which will be be extracted
 * and applied to the rendered img tag.
 */
function image({ href, text }) {
  let { info, alt } = text.match(/^(?:\{(?<info>[^}]+)\})?\s*(?<alt>.*)?/)
    ?.groups ?? { info: "", alt: text };

  info = parseInfo(info);

  let width = info.attributes.width ? ` width="${info.attributes.width}"` : "";
  let height = info.attributes.height
    ? ` height="${info.attributes.height}"`
    : "";
  let classname =
    info.classes.length > 0 ? ` class="${info.classes.join(" ")}" ` : " ";

  return `<img src="${href}"${classname}alt="${alt}"${width}${height} />`;
}

// /** @type {import("marked").RendererExtension} */
const extension = {
  renderer: { image },
};

export default extension;
