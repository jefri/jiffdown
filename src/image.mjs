/**
 * Process an inline image with the format `![Alt Text][src "=size title"]`.
 * Title can start with size as `=[width]:[height] `, which will be be extracted
 * and applied to the rendered img tag.
 */
function image(src, mdTitle, alt) {
  mdTitle = mdTitle ?? "";
  let { width, height, title } = mdTitle.match(
    /^(?:=(?<width>[^\s:]*)(:(?<height>[^\s]+))?)\s*(?<title>.*)$/
  )?.groups ?? { width: "", height: "", title: mdTitle };

  width = width ? ` width="${width}"` : "";
  height = height ? ` height="${height}"` : "";
  title = title ? ` title="${title}"` : "";

  return `<img src="${src}" alt="${alt}"${width}${height}${title} />`;
}

// /** @type {import("marked").RendererExtension} */
const extension = {
  renderer: { image },
};

export default extension;
