# jiffdown

Inline, block, and reference extensions to Markdown

## Block infostrings

- Blocks: `>{block infostring} content` creates a non-p block element. With no infostring, defaults to `blockquote`. Infostring can add classes, change tags, set IDs, and apply attributes.
- Inline blocks: `{Block infostring: content}` creates an inline element. With no infostring, defaults to `span`. Can add classes, change tags, set IDs, and apply attributes.
- Block infostring: `tag #id .class [attr=value]` sets the tag for the block. Appropriate tags depend on target (HTML vs Zonbook). IDs can be referenced by reference copying. Attributes and classes are supported based on the target.

## Custom entities

- Entity definition: `&entity: Value;` Define a new entity, for instance `&aws: Amazon Web Services;` would expand `&aws;` into "Amazon Web Services"
- Entity usage: `&entity;` Uses an entity defined in this document, after reference copying.

## Sections & Reference copying

- Sections: From Heading until the next same level heading or end of file. Sections have implicit IDs
- References: `&{ref infostring: refval};` References copy the refval into place here. This is different than `![]()` syntax, which links to the appropriate contet.
- Ref infostring: `move|copy` If copy (default), copies the content from there to here. If move, removes value from there.
- Refval: `#id`, `./relative_path`, `./adjacent.md#id`

# Syntaxes

| Symbol          | Usage            | Status                  |
| --------------- | ---------------- | ----------------------- |
| ---\n\n---      | yaml frontmatter | [✅ (front-matter)](fm) |
| #, ##           | Headings         | ✅                      |
| sections        | \<section>       | ✅                      |
| -, 1., \:       | List             | ✅                      |
| >{}             | Blocks           | ✅                      |
| \[]()           | Link             | ✅                      |
| !\[]()          | Image Link       | ✅                      |
| \<br>           | HTML             | ✅                      |
| {time:10/11/23} | Inline           | ✅                      |
| {img src="url"} | Image            | ✅                      |
| &...;           | Entity           | ✅                      |
| &{};            | Reference        | ✅                      |
| `               | Code             | ✅                      |
| \_, \*, ~       | Formatting       | ✅                      |
| $               | Math             |

[fm]: https://www.npmjs.com/package/front-matter
