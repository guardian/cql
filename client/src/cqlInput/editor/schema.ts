import { Schema } from "prosemirror-model";

export const DELETE_CHIP_INTENT = "DELETE_CHIP_INTENT";
export const IS_READ_ONLY = "IS_READ_ONLY";

export const schema = new Schema({
  nodes: {
    doc: {
      content: "searchText (chip searchText)*",
    },
    text: {
      group: "inline",
    },
    searchText: {
      content: "inline*",
      toDOM: () => ["search-text", 0],
      whitespace: "pre",
    },
    chip: {
      content: "(chipKey chipValue)?",
      toDOM: () => ["chip", 0],
      attrs: {
        [DELETE_CHIP_INTENT]: {
          default: false,
        },
      },
    },
    chipKey: {
      content: "inline*",
      toDOM: () => ["chip-key", 0],
      attrs: {
        [IS_READ_ONLY]: {
          default: false,
        },
      },
    },
    chipValue: {
      content: "inline*",
      whitespace: "pre",
      toDOM: () => ["chip-value", 0],
    },
  },
});

export const { chip, chipKey, chipValue, searchText, doc } = schema.nodes;
