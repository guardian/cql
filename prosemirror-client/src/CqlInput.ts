import {
  AllSelection,
  EditorState,
  Plugin,
  PluginKey,
  Selection,
  TextSelection,
} from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";
import { Node, NodeType, Schema } from "prosemirror-model";
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
      whitespace: "pre",
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
      toDOM: (_) => ["chip-key", { "tabindex": "0" }, 0],
    },
    chipValue: {
      content: "inline*",
      group: "block",
      toDOM: (_) => ["chip-value", { "tabindex": "0" }, 0],
    },
  },
});

const { chip, chipKey, chipValue, searchText, chipWrapper, doc } = schema.nodes;
const initialContent = doc.create(undefined, [
  searchText.create(undefined, [schema.text("example")]),
]);

const template = document.createElement("template");
template.innerHTML = `
  <style>
    .ProseMirror {
      white-space: pre-wrap;
    }

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
      display: flex;
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
              schema.nodes.searchText.create(undefined, schema.text(" "))
            )
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
        str += node.textContent.length > 0 ? `:${node.textContent} ` : "";
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
      const updateView = (
        query: string,
        shouldWrapSelectionInKey: boolean = false
      ) => {
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

          const selection = getNewSelection(
            userSelection,
            shouldWrapSelectionInKey,
            tr.doc
          );

          tr.setSelection(selection);
          tr.setMeta(NEW_TOKENS, response.tokens);

          view.dispatch(tr);
        });
      };

      updateView(cqlPluginKey.getState(view.state)?.queryStr!);

      return {
        update(view, prevState) {
          const prevQuery = cqlPluginKey.getState(prevState)?.queryStr!;
          const currentQuery = cqlPluginKey.getState(view.state)?.queryStr!;

          if (prevQuery.trim() === currentQuery.trim()) {
            return;
          }

          const shouldWrapSelectionInKey = isBeginningKeyValPair(
            prevQuery,
            currentQuery
          );

          updateView(currentQuery, shouldWrapSelectionInKey);
        },
      };
    },
  });

const keyValPairChars = ["+", "@"];

const isBeginningKeyValPair = (first: string, second: string): boolean => {
  const firstDiffChar = getFirstDiff(first, second);
  return firstDiffChar ? keyValPairChars.includes(firstDiffChar) : false;
};

const getFirstDiff = (first: string, second: string): string | undefined => {
  for (let i = 0; i < first.length; i++) {
    if (second[i] !== first[i]) {
      return second[i];
    }
  }
};

const findNodeAt = (pos: number, doc: Node, type: NodeType): number => {
  let found = -1;
  doc.nodesBetween(pos - 1, doc.content.size, (node, pos) => {
    if (found > -1) return false;
    if (node.type === type) found = pos;
  });
  return found;
};

const getNewSelection = (
  currentSelection: Selection,
  shouldWrapSelectionInKey: boolean,
  doc: Node
): Selection => {
  if (shouldWrapSelectionInKey) {
    const nodePos = findNodeAt(currentSelection.from, doc, chipKey);

    if (nodePos !== -1) {
      const $pos = doc.resolve(nodePos);
      const selection = TextSelection.findFrom($pos, 1);
      if (selection) {
        return selection;
      }
    }
  }

  return TextSelection.create(
    doc,
    Math.min(currentSelection.from, doc.nodeSize - 2),
    Math.min(currentSelection.to, doc.nodeSize - 2)
  );
};

const logNode = (doc: Node) => {
  console.log(`Log node ${doc.type.name}`);

  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    const indent = doc.resolve(pos).depth * 4;
    console.log(`${" ".repeat(indent)} ${node.type.name} ${pos}`);
  });
};
