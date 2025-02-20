import { Schema } from "prosemirror-model";

export const DELETE_CHIP_INTENT = "DELETE_CHIP_INTENT";
export const IS_READ_ONLY = "IS_READ_ONLY";

export const schema = new Schema({
  nodes: {
    doc: {
      content: "queryStr (chip queryStr)*",
    },
    queryStr: {
      content: "text*",
      toDOM: () => ["query-str", 0],
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
      content: "text*",
      toDOM: () => ["chip-key", 0],
      attrs: {
        [IS_READ_ONLY]: {
          default: false,
        },
      },
    },
    chipValue: {
      content: "text*",
      whitespace: "pre",
      toDOM: () => ["chip-value", 0],
    },
    text: {},
  },
});

export const { chip, chipKey, chipValue, queryStr, doc } = schema.nodes;
