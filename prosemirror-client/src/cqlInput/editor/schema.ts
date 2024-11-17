import { Schema } from "prosemirror-model";

export const DELETE_CHIP_INTENT = "DELETE_CHIP_INTENT";

export const schema = new Schema({
  nodes: {
    doc: {
      content: "searchText (chip searchText)*",
    },
    text: {
      group: "inline",
    },
    searchText: {
      group: "block",
      content: "inline*",
      toDOM: () => ["search-text", 0],
      whitespace: "pre",
    },
    chip: {
      content: "(chipKey chipValue)?",
      group: "block",
      toDOM: () => ["chip", 0],
      attrs: {
        [DELETE_CHIP_INTENT]: {
          default: false,
        },
      }
    },
    chipKey: {
      content: "inline*",
      group: "block",
      toDOM: () => ["chip-key", 0],
    },
    chipValue: {
      content: "inline*",
      group: "block",
      whitespace: "pre",
      toDOM: () => ["chip-value", 0],
    },
  },
});

export const { chip, chipKey, chipValue, searchText, doc } = schema.nodes;
