# jiffdown

Inline, block, and reference extensions to Markdown

## Block infostrings 

* Blocks: `>{block infostring} content`
* Inline blocks: `{Block infostring: content}`
* Block infostring: `tag #id .class [attr=value]`

## Custom entities

* Entity definition: `&entity: Value;` Define a new entity. EG `&aws: Amazon Web Services;` would expand `&aws;` into "Amazon Web Services"
* Entity usage: `&entity;`

## Sections & Reference copying

* Sections: From Heading until the next same level heading or end of file. Sections have implicit IDs
* References: `&{ref infostring: refval};` References copy the refval into place here.
* Ref infostring: `move|copy` If copy (default), copies the content from there to here. If move, removes value from there.
* Refval: `#id`, `./relative_path`, `./adjacent.md#id`
