import { Leaf, Mark, Plot, Schema } from "wordgard/doc";

/**
 * The polarity of a chip ("+" include / "-" exclude) is stored as the chip
 * plot's parameter value, since it is a persistent part of the chip's
 * identity.
 */
export const POLARITY = "POLARITY";

/**
 * `queryStr` is a textblock holding a run of free query text.
 */
export const queryStrTag = Plot.define("queryStr", {
  inlineContent: true,
  preserveWhitespace: true,
  shape: { element: "query-str" },
});

/**
 * `chipKey` is the (editable) key portion of a chip, e.g. the `tag` in
 * `+tag:news`.
 */
export const chipKeyTag = Plot.define("chipKey", {
  inlineContent: true,
  shape: { element: "chip-key" },
});

/**
 * `chipValue` is the value portion of a chip, e.g. the `news` in `+tag:news`.
 */
export const chipValueTag = Plot.define("chipValue", {
  inlineContent: true,
  preserveWhitespace: true,
  shape: { element: "chip-value" },
});

/**
 * `chip` is a key/value pair. Its parameter carries the chip polarity, which
 * is reflected on the DOM element as a `data-polarity` attribute.
 */
export const chipType = Plot.Type.define<string>("chip", {
  defaultParam: "+",
  blockContent: [chipKeyTag.type, chipValueTag.type],
  shape: {
    element: "chip",
    attributes: (polarity: string) => ({ "data-polarity": polarity }),
    readElement: (element) => element.getAttribute("data-polarity") ?? "+",
  },
});

/**
 * The document is a `queryStr`, followed by zero or more `chip queryStr`
 * pairs. Wordgard cannot express that alternation as a content query, so the
 * `queryStr (chip queryStr)*` invariant is enforced separately via a
 * Correction in the plugin layer; here we only declare the set of node types
 * the document may contain.
 */
export const docType = Plot.defineDoc({
  blockContent: [queryStrTag.type, chipType],
  canBeEmpty: false,
});

/**
 * Marks the chip as selected. Presence of the mark replaces the old
 * `IS_SELECTED` node attribute.
 */
export const selectedMark = Mark.define("selected", {
  target: chipType,
  spanning: false,
  shape: { attributes: { "data-selected": "true" } },
});

/**
 * Marks a chip key or value as read-only. Presence of the mark replaces the
 * old `IS_READ_ONLY` node attribute. Chip values are read-only until their
 * sibling key has content.
 */
export const readOnlyMark = Mark.define("readOnly", {
  target: [chipKeyTag.type, chipValueTag.type],
  spanning: false,
  shape: { attributes: { "data-readonly": "true" } },
});

export const schema = Schema.define([
  docType,
  queryStrTag,
  chipKeyTag,
  chipValueTag,
  chipType,
  Leaf.Text,
  selectedMark,
  readOnlyMark,
]);

/**
 * Node types, exported under their historical names so that
 * `node.type === chip` style checks continue to read naturally.
 */
export const doc = docType;
export const queryStr = queryStrTag.type;
export const chipKey = chipKeyTag.type;
export const chipValue = chipValueTag.type;
export const chip = chipType;

/** The text leaf type. */
export const text = Leaf.Text;
