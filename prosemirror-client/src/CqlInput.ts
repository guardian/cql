import {
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
} from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node, Schema } from "prosemirror-model";
import { CqlService } from "./CqlService";

// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const schema = new Schema({
  nodes: {
    doc: {
      content: "searchText chipWrapper searchText",
    },
    text: {
      group: "inline",
    },
    placeholder: {
      group: "block",
      content: "inline*",
      toDOM: (_) => ["placeholder"],
    },
    searchText: {
      group: "block",
      content: "inline*",
      toDOM: (_) => ["search-text", 0],
    },
    chipWrapper: {
      content: "chip*",
      group: "block",
      toDOM: (_) => ["chip-wrapper", 0],
    },
    chip: {
      content: "chipKey chipValue",
      group: "block",
      toDOM: (_) => ["chip", 0],
    },
    chipKey: {
      content: "inline*",
      group: "block",
      toDOM: (_) => ["chip-key", 0],
    },
    chipValue: {
      content: "inline*",
      group: "block",
      toDOM: (_) => ["chip-value", 0],
    },
  },
});

const { chip, chipKey, chipValue, searchText, chipWrapper, doc } = schema.nodes;
const initialContent = doc.create(undefined, [
  searchText.create(undefined, [schema.text("example")]),
  chipWrapper.create(undefined, [
    chip.create(undefined, [
      chipKey.create(undefined, [schema.text("tag")]),
      chipValue.create(undefined, [schema.text("News")]),
    ]),
    chip.create(undefined, [
      chipKey.create(undefined, [schema.text("tag")]),
      chipValue.create(undefined, [schema.text("News")]),
    ]),
  ]),
]);

const template = document.createElement("template");
template.innerHTML = `
  <style>
    search-text {
      /* Ensure there's always space for input */
      display: inline-block;
      min-width: 5px;
    }
    chip {
      display: block;
    }
    chip-wrapper: { display: flex-inline; }
    chip {
      display: inline-flex;
      background-color: rgba(255,255,255,0.2);
      border-left: 1px solid rgba(255,255,255,0.2);
      border-right: 1px solid rgba(255,255,255,0.2);
      padding: 0 5px;
      margin: 0 5px;
    }
    chip-key {
      padding-right: 5px;
    }
    chip-key:after {
      content: ':'
    }
  </style>
`;

export const createCqlInput = (cqlService: CqlService) => {
  class CqlInput extends HTMLElement {
    connectedCallback() {
      const shadow = this.attachShadow({ mode: "closed" });

      shadow.innerHTML = `<div id="cql-input"></div>`;
      shadow.appendChild(template.content.cloneNode(true));
      const cqlInput = shadow.getElementById("cql-input")!;

      this.setupEditor(cqlInput);
    }

    private setupEditor = (mountEl: HTMLElement) => {
      const plugin = createCqlPlugin(cqlService);
      const view = new EditorView(mountEl, {
        state: EditorState.create({
          doc: initialContent,
          schema: schema,
          plugins: [plugin],
        }),
        dispatchTransaction(tr) {
          view.updateState(view.state.apply(tr));

          if (view.state.doc.lastChild?.type.name === "chipWrapper") {
            const tr = view.state.tr;
            tr.insert(
              view.state.doc.nodeSize - 2,
              schema.nodes.searchText.create(undefined, schema.text(" "))
            ).setSelection(
              new TextSelection(tr.doc.resolve(tr.doc.nodeSize - 3))
            );
            view.updateState(view.state.apply(tr));
          }
        },
      });

      window.CQL_VIEW = view;
    };
  }

  return CqlInput;
};

const queryStrFromDoc = (doc: Node) => {
  let str: string = "";

  doc.descendants((node) => {
    switch (node.type.name) {
      case "searchText":
        str += `${node.textContent} `;
        return false;
      case "chipKey":
        str += `+${node.textContent}`;
        return false;
      case "chipValue":
        str += `:${node.textContent} `;
        return false;
      default:
        return true;
    }
  });

  return str;
};

const cqlPluginKey = new PluginKey<string>("cql-plugin");

const createCqlPlugin = (cqlService: CqlService) =>
  new Plugin({
    key: cqlPluginKey,
    state: {
      init(config) {
        return config.doc ? queryStrFromDoc(config.doc) : undefined;
      },
      apply(_, __, ___, newState) {
        return queryStrFromDoc(newState.doc);
      },
    },
    view() {
      return {
        update(view, prevState) {
          const prevQuery = cqlPluginKey.getState(prevState)!;
          const currentQuery = cqlPluginKey.getState(view.state)!;

          if (prevQuery === currentQuery) {
            return;
          }

          cqlService.fetchTokens(currentQuery).then((tokens) => {
            console.log(tokens);
          });
        },
      };
    },
  });
