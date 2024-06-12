import { Schema } from "prosemirror-model";

export const schema = new Schema({
  nodes: {
    doc: {
      content: "(searchText | chipWrapper)*",
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
    chipWrapper: {
      content: "chip*",
      group: "block",
      toDOM: () => ["chip-wrapper", 0],
    },
    chip: {
      content: "chipKey chipValue",
      group: "block",
      toDOM: () => ["chip", 0],
    },
    chipKey: {
      content: "inline*",
      group: "block",
      toDOM: () => ["chip-key", { tabindex: "0" }, 0],
    },
    chipValue: {
      content: "inline*",
      group: "block",
      whitespace: "pre",
      toDOM: () => ["chip-value", { tabindex: "0" }, 0],
    },
  },
});

export const { chip, chipKey, chipValue, searchText, chipWrapper, doc } =
  schema.nodes;