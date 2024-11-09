import { DecorationSet } from "prosemirror-view";
import { CqlError, CqlServiceInterface } from "../../services/CqlService";
import {
  AllSelection,
  Plugin,
  PluginKey,
  Transaction,
} from "prosemirror-state";
import {
  getNewSelection,
  isBeginningKeyValPair,
  docToQueryStr,
  tokensToDecorations,
  tokensToDoc,
  ProseMirrorToken,
  applyDeleteIntent,
  errorToDecoration,
  mapResult,
  queryHasChanged,
  toMappedSuggestions,
} from "./utils";
import { Mapping } from "prosemirror-transform";
import { TypeaheadPopover } from "../TypeaheadPopover";
import { chip, DELETE_CHIP_INTENT, doc, schema } from "./schema";
import { DOMSerializer, Fragment } from "prosemirror-model";
import { QueryChangeEventDetail } from "../../types/dom";
import { ErrorPopover } from "../ErrorPopover";
import { CqlConfig } from "../CqlInput";
import {
  getDebugASTHTML,
  getDebugMappingHTML,
  getDebugTokenHTML,
  getOriginalQueryHTML,
} from "./debug";
import { Query } from "../../lang/ast";

const cqlPluginKey = new PluginKey<PluginState>("cql-plugin");

type PluginState = {
  tokens: ProseMirrorToken[];
  queryStr: string;
  query: Query | undefined;
  error: CqlError | undefined;
  mapping: Mapping;
};

const ACTION_NEW_STATE = "NEW_STATE";
const ACTION_SERVER_ERROR = "SERVER_ERROR";

export const ERROR_CLASS = "Cql__ErrorWidget";
export const VISIBLE_CLASS = "Cql--isVisible";

/**
 * The CQL plugin handles most aspects of the editor behaviour, including
 *  - fetching results from the language server, and applying them to the document
 *  - applying decorations for syntax highlighting
 *  - managing typeahead behaviour
 *  - providing a NodeView for rendering chips
 *  - handling clipboard (de)serialisation
 *  - managing custom keyboard and selection behaviour
 */
export const createCqlPlugin = ({
  cqlService,
  typeaheadEl,
  errorEl,
  errorMsgEl,
  onChange,
  config: { syntaxHighlighting, debugEl },
}: {
  cqlService: CqlServiceInterface;
  typeaheadEl: HTMLElement;
  errorEl: HTMLElement;
  errorMsgEl: HTMLElement;
  config: CqlConfig;
  onChange: (detail: QueryChangeEventDetail) => void;
}) => {
  let typeaheadPopover: TypeaheadPopover | undefined;
  let errorPopover: ErrorPopover | undefined;
  let debugTokenContainer: HTMLElement | undefined;
  let debugASTContainer: HTMLElement | undefined;
  let debugMappingContainer: HTMLElement | undefined;
  let jsonDebugContainer: HTMLElement | undefined;
  if (debugEl) {
    debugMappingContainer = document.createElement("div");
    debugMappingContainer.classList.add("CqlDebug__mapping");
    debugEl.appendChild(debugMappingContainer);
    jsonDebugContainer = document.createElement("div");
    jsonDebugContainer.classList.add("CqlDebug__json");
    debugEl.appendChild(jsonDebugContainer);
    debugTokenContainer = document.createElement("div");
    jsonDebugContainer.appendChild(debugTokenContainer);
    debugASTContainer = document.createElement("div");
    jsonDebugContainer.appendChild(debugASTContainer);
  }

  return new Plugin<PluginState>({
    key: cqlPluginKey,
    state: {
      init(_, state) {
        const queryStr = docToQueryStr(state.doc);
        return {
          tokens: [],
          suggestions: [],
          mapping: new Mapping(),
          queryStr,
          query: cqlService.parseCqlQueryStr(queryStr).query,
          error: undefined,
        };
      },
      apply(tr, state, oldState) {
        const maybeError: string | undefined = tr.getMeta(ACTION_SERVER_ERROR);
        if (maybeError) {
          return {
            ...state,
            tokens: [],
            error: { message: maybeError },
          };
        }

        const maybeNewState: PluginState | undefined =
          tr.getMeta(ACTION_NEW_STATE);

        if (!maybeNewState) {
          if (cqlPluginKey.getState(oldState)?.error && tr.docChanged) {
            return {
              ...state,
              error: undefined,
            };
          }
          return state;
        }

        return maybeNewState;
      },
    },
    appendTransaction(_, oldState, newState) {
      let tr: Transaction | undefined;

      const maybeQueries = queryHasChanged(oldState.doc, newState.doc);

      if (maybeQueries) {
        const { prevQuery, currentQuery } = maybeQueries;
        const shouldWrapSelectionInKey = isBeginningKeyValPair(
          prevQuery,
          currentQuery
        );

        tr = newState.tr;
        const result = cqlService.parseCqlQueryStr(currentQuery);
        const {
          tokens,
          query: ast,
          error,
          queryResult,
          mapping,
        } = mapResult(result);

        const newDoc = tokensToDoc(tokens);

        if (debugASTContainer) {
          debugASTContainer.innerHTML = `<h2>AST</h2><div>${JSON.stringify(
            ast,
            undefined,
            "  "
          )}</div>`;
        }
        if (debugTokenContainer) {
          debugTokenContainer.innerHTML = `<h2>Tokens</h2><div>${JSON.stringify(
            tokens,
            undefined,
            "  "
          )}</div>`;
        }

        if (debugMappingContainer) {
          debugMappingContainer.innerHTML = `
            <p>Original query: </p>
            ${getOriginalQueryHTML(currentQuery)}
            <p>Tokenises to:</p>
            ${getDebugTokenHTML(result.tokens)}
            ${
              result.query
                ? `<p>AST: </p>
            ${getDebugASTHTML(result.query)}`
                : ""
            }
            <p>Maps to nodes: </p>
            ${getDebugMappingHTML(currentQuery, mapping, newDoc)}
          `;
        }

        const userSelection = newState.selection;
        const docSelection = new AllSelection(newState.doc);

        if (!newDoc.eq(newState.doc)) {
          tr.replaceWith(
            docSelection.from,
            docSelection.to,
            newDoc
          ).setSelection(
            getNewSelection(userSelection, shouldWrapSelectionInKey, tr.doc)
          );
        }

        tr.setMeta(ACTION_NEW_STATE, { tokens, error, query: ast, mapping });

        // @todo: this does not really belong here! Possibly in view? (Side effect)
        onChange({
          cqlQuery: docToQueryStr(newDoc),
          query: queryResult ?? "",
        });
      }

      // If the selection has changed, reset any chips that are pending delete
      if (!oldState.selection.eq(newState.selection)) {
        const posOfChipWrappersToReset: number[] = [];
        newState.doc.descendants((node, pos) => {
          if (node.type === chip && node.attrs[DELETE_CHIP_INTENT]) {
            posOfChipWrappersToReset.push(pos);
          }
        });
        if (posOfChipWrappersToReset.length) {
          tr = newState.tr;
          posOfChipWrappersToReset.forEach((pos) => {
            tr?.setNodeAttribute(pos, DELETE_CHIP_INTENT, false);
          });
          return tr;
        }
      }

      return tr;
    },
    props: {
      nodeViews: {
        [chip.name](initialNode, view, getPos) {
          const handleDeleteClickEvent = () => {
            const pos = getPos();
            if (!pos) {
              return;
            }

            const $pos = view.state.doc.resolve(pos);
            const node = $pos.nodeAfter;

            if (!node) {
              return;
            }

            applyDeleteIntent(view, pos, pos + node.nodeSize + 1, node);
          };

          const dom = document.createElement("chip-wrapper");
          const contentDOM = document.createElement("span");
          contentDOM.classList.add("Cql__ChipWrapperContent");
          const polarityHandle = document.createElement("span");
          polarityHandle.classList.add("Cql__ChipWrapperPolarityHandle");
          polarityHandle.setAttribute("contentEditable", "false");
          polarityHandle.innerHTML = "+";

          const deleteHandle = document.createElement("span");
          deleteHandle.classList.add("Cql__ChipWrapperDeleteHandle");
          deleteHandle.setAttribute("contentEditable", "false");
          deleteHandle.innerHTML = "×";
          deleteHandle.addEventListener("click", handleDeleteClickEvent);

          dom.appendChild(polarityHandle);
          dom.appendChild(contentDOM);
          dom.appendChild(deleteHandle);
          const pendingDeleteClass = "Cql__ChipWrapper--is-pending-delete";
          return {
            dom,
            contentDOM,
            update(node) {
              if (node.type !== initialNode.type) {
                return false;
              }

              if (node.attrs[DELETE_CHIP_INTENT] === true) {
                dom.classList.add(pendingDeleteClass);
              } else {
                dom.classList.remove(pendingDeleteClass);
              }
              return true;
            },
          };
        },
      },
      decorations: (state) => {
        const { tokens, error } = cqlPluginKey.getState(state)!;

        const maybeErrorDeco = error?.position
          ? [errorToDecoration(error.position)]
          : [];

        const maybeTokensToDecorations = syntaxHighlighting
          ? tokensToDecorations(tokens)
          : [];

        return DecorationSet.create(state.doc, [
          ...maybeErrorDeco,
          ...maybeTokensToDecorations,
        ]);
      },
      handleKeyDown(view, event) {
        switch (event.key) {
          case "+": {
            console.log("PLUS");
            const { doc, selection } = view.state;
            const maybeTrailingWhitespace =
              selection.from === selection.to &&
              !["", " "].some(
                (str) =>
                  doc.textBetween(selection.from, selection.to + 1) === str
              )
                ? " "
                : "";

            if (!maybeTrailingWhitespace) {
              return false;
            }

            event.preventDefault();

            const textToInsert = `+${maybeTrailingWhitespace}`;
            const tr = view.state.tr.insertText(textToInsert);

            view.dispatch(tr);

            return true;
          }
          // What should the behaviour of tab be?
          case "Tab": {
            if (event.shiftKey) {
              // Reverse tab
              return true;
            }
            return true;
          }
          case "Delete": {
            // Look forward for node
            const { anchor } = view.state.selection;
            const positionAfterSearchText = Math.max(anchor + 1, 0);
            const $nextPos = view.state.doc.resolve(positionAfterSearchText);
            const nextNode = $nextPos.nodeAfter;

            if (!nextNode) {
              return false;
            }

            return applyDeleteIntent(
              view,
              $nextPos.pos,
              $nextPos.pos + nextNode.nodeSize,
              nextNode
            );
          }
          case "Backspace": {
            // Look backward for node
            const { anchor } = view.state.selection;
            const positionBeforeSearchText = Math.max(anchor - 1, 0);
            const $prevPos = view.state.doc.resolve(positionBeforeSearchText);
            const prevNode = $prevPos.nodeBefore;

            if (!prevNode) {
              return false;
            }

            const prevNodePos = $prevPos.pos - prevNode.nodeSize;

            return applyDeleteIntent(view, prevNodePos, $prevPos.pos, prevNode);
          }
        }

        if (!typeaheadPopover?.isRenderingNavigableMenu()) {
          return false;
        }
        switch (event.code) {
          case "ArrowUp":
            typeaheadPopover.moveSelectionUp();
            return true;
          case "ArrowDown":
            typeaheadPopover.moveSelectionDown();
            return true;
          case "Enter":
            typeaheadPopover.applyOption();
            return true;
        }
      },
      // Serialise outgoing content to a CQL string for portability in both plain text and html
      clipboardTextSerializer(content) {
        const node = doc.create(undefined, content.content);
        const queryStr = docToQueryStr(node);
        return queryStr;
      },
      clipboardSerializer: {
        serializeFragment: (fragment: Fragment) => {
          const node = doc.create(undefined, fragment);
          const queryStr = docToQueryStr(node);
          const plainTextNode = DOMSerializer.fromSchema(schema).serializeNode(
            schema.text(queryStr)
          );
          return plainTextNode;
        },
      } as DOMSerializer, // Cast because docs specify only serializeFragment is needed
    },
    view(view) {
      typeaheadPopover = new TypeaheadPopover(
        view,
        typeaheadEl,
        jsonDebugContainer
      );
      errorPopover = new ErrorPopover(
        view,
        errorEl,
        errorMsgEl,
        jsonDebugContainer
      );

      return {
        async update(view) {
          const { error, query, mapping } = cqlPluginKey.getState(view.state)!;

          errorPopover?.updateErrorMessage(error);

          if (query) {
            const suggestions = await cqlService.fetchSuggestions(query);
            const mappedSuggestions = toMappedSuggestions(suggestions, mapping);
            typeaheadPopover?.updateItemsFromSuggestions(mappedSuggestions);
          }
        },
      };
    },
  });
};
