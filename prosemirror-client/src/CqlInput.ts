import {
  AllSelection,
  EditorState,
  Plugin,
  PluginKey,
  TextSelection,
} from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Node, Schema } from "prosemirror-model";
import { CqlService } from "./CqlService";

// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const schema = new Schema({
  nodes: {
    doc: {
      content: "(searchText | chipWrapper)*",
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
  ]),
  searchText.create(undefined, [schema.text("example")]),
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

    .CqlToken__STRING {
      color: lightblue;
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

const cqlPluginKey = new PluginKey<PluginState>("cql-plugin");

const tokensToNodes = (tokens: Token[]): Node =>
  doc.create(
    undefined,
    tokens.flatMap((token, index) => {
      switch (token.tokenType) {
        case "QUERY_FIELD_KEY":
          const tokenKey = token.literal;
          const tokenValue = tokens[index + 1]?.literal;
          return [
            chipWrapper.create(undefined, [
              chip.create(undefined, [
                chipKey.create(
                  undefined,
                  tokenKey ? schema.text(tokenKey) : undefined
                ),
                chipValue.create(
                  undefined,
                  tokenValue ? schema.text(tokenValue) : undefined
                ),
              ]),
            ]),
          ];
        case "QUERY_VALUE":
        case "EOF":
          return [];
        default:
          return [searchText.create(undefined, schema.text(token.literal!))];
      }
    })
  );

const tokensToDecorationSet = (tokens: Token[]): Decoration[] => {
  let offset = 1; // Start of doc

  return tokens.flatMap((token) => {
    switch (token.tokenType) {
      case "QUERY_FIELD_KEY":
        offset += 4; // Chip node plus wrapper
        return [];
      case "QUERY_VALUE":
        offset += 2; // Chip node
        return [];
      case "EOF":
        return [];
      default:
        const start = token.start + offset;
        const end = token.end + offset + 1;
        return [
          Decoration.inline(
            start,
            end,
            { class: `CqlToken__${token.tokenType}` },
            { key: `${start}-${end}` }
          ),
        ];
    }
  });
};

type PluginState = {
  queryStr?: string;
  decorations: DecorationSet;
};

const NEW_TOKENS = "NEW_TOKENS";

const createCqlPlugin = (cqlService: CqlService) =>
  new Plugin<PluginState>({
    key: cqlPluginKey,
    state: {
      init(config) {
        const queryStr = config.doc ? queryStrFromDoc(config.doc) : undefined;
        return {
          queryStr,
          decorations: DecorationSet.empty,
        };
      },
      apply(tr, pluginState, ___, newState) {
        const maybeNewTokens: Token[] = tr.getMeta(NEW_TOKENS);
        const decorations = maybeNewTokens
          ? DecorationSet.create(
              newState.doc,
              maybeNewTokens ? tokensToDecorationSet(maybeNewTokens) : []
            )
          : pluginState.decorations;

        return {
          queryStr: queryStrFromDoc(newState.doc),
          decorations,
        };
      },
    },
    props: {
      decorations: (state) => cqlPluginKey.getState(state)?.decorations,
    },
    view(view) {
      const updateView = (query: string) => {
        cqlService.fetchResult(query).then((response) => {
          console.log({ response });
          const newDoc = tokensToNodes(response.tokens);
          const userSelection = view.state.selection;
          const docSelection = new AllSelection(view.state.doc);
          const tr = view.state.tr.replaceWith(
            docSelection.from,
            docSelection.to,
            newDoc
          );
          tr.setSelection(
            TextSelection.create(
              tr.doc,
              Math.min(userSelection.from, tr.doc.nodeSize - 2),
              Math.min(userSelection.to, tr.doc.nodeSize - 2)
            )
          );
          tr.setMeta(NEW_TOKENS, response.tokens);

          view.dispatch(tr);
        });
      };

      updateView(cqlPluginKey.getState(view.state)?.queryStr!);

      return {
        update(view, prevState) {
          const prevQuery = cqlPluginKey.getState(prevState)?.queryStr!;
          const currentQuery = cqlPluginKey.getState(view.state)?.queryStr!;

          if (prevQuery === currentQuery) {
            return;
          }

          updateView(currentQuery);
        },
      };
    },
  });
