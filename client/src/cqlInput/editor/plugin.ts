import { DecorationSet } from "prosemirror-view";
import {
  CqlError,
  CqlSuggestionService,
} from "../../services/CqlSuggestionService";
import {
  AllSelection,
  Plugin,
  PluginKey,
  Transaction,
} from "prosemirror-state";
import {
  maybeMoveSelectionIntoChipKey,
  docToCqlStr,
  tokensToDecorations,
  tokensToDoc,
  ProseMirrorToken,
  applyDeleteIntent,
  errorToDecoration,
  mapResult,
  queryHasChanged,
  toMappedSuggestions,
  applyReadOnlyChipKeys,
  getNodeTypeAtSelection,
  applySuggestion,
  skipSuggestion,
} from "./utils";
import { Mapping } from "prosemirror-transform";
import { TypeaheadPopover } from "../popover/TypeaheadPopover";
import {
  chip,
  chipKey,
  chipValue,
  DELETE_CHIP_INTENT,
  doc,
  IS_READ_ONLY,
  schema,
} from "./schema";
import { DOMSerializer, Fragment } from "prosemirror-model";
import { QueryChangeEventDetail } from "../../types/dom";
import { ErrorPopover } from "../popover/ErrorPopover";
import { CqlConfig } from "../CqlInput";
import {
  getDebugASTHTML,
  getDebugMappingHTML,
  getDebugTokenHTML,
  getOriginalQueryHTML,
} from "./debug";
import { CqlQuery } from "../../lang/ast";
import { parseCqlStr } from "../../lang/Cql";

const cqlPluginKey = new PluginKey<PluginState>("cql-plugin");

type PluginState = {
  tokens: ProseMirrorToken[];
  queryStr: string;
  query: CqlQuery | undefined;
  error: CqlError | undefined;
  mapping: Mapping;
};

const ACTION_NEW_STATE = "NEW_STATE";
const ACTION_SERVER_ERROR = "SERVER_ERROR";

export const CLASS_ERROR = "Cql__ErrorWidget";
export const CLASS_VISIBLE = "Cql--isVisible";
export const CLASS_CHIP_KEY_READONLY = "Cql__ChipKey--readonly";

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
  cqlSuggestionsService: cqlService,
  typeaheadEl,
  errorEl,
  errorMsgEl,
  onChange,
  config: { syntaxHighlighting, debugEl },
}: {
  cqlSuggestionsService: CqlSuggestionService;
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
  let debugSuggestionsContainer: HTMLElement | undefined;
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
    debugSuggestionsContainer = document.createElement("div");
    jsonDebugContainer.appendChild(debugSuggestionsContainer);
  }

  /**
   * Replaces the current document with the query it produces on parse.
   *
   * Side-effects: mutates the given transaction, and re-applies debug UI if provided.
   */
  const applyQueryToTr = (tr: Transaction) => {
    const queryBeforeParse = docToCqlStr(tr.doc);

    const result = parseCqlStr(queryBeforeParse);
    const {
      tokens,
      query: ast,
      error,
      mapping,
      queryResult,
    } = mapResult(result);

    const newDoc = tokensToDoc(tokens);
    const queryAfterParse = docToCqlStr(newDoc); // The document may have changed as a result of the parse.

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
            ${getOriginalQueryHTML(queryAfterParse)}
            <p>Tokenises to:</p>
            ${getDebugTokenHTML(result.tokens)}
            ${
              result.query
                ? `<p>AST: </p>
            ${getDebugASTHTML(result.query)}`
                : ""
            }
            <p>Maps to nodes: </p>
            ${getDebugMappingHTML(queryAfterParse, mapping, newDoc)}
          `;
    }

    const docSelection = new AllSelection(tr.doc);

    if (!newDoc.eq(tr.doc)) {
      const selectionPriorToInsertion = tr.selection;
      tr.replaceWith(docSelection.from, docSelection.to, newDoc).setSelection(
        maybeMoveSelectionIntoChipKey({
          selection: selectionPriorToInsertion,
          currentDoc: tr.doc,
        })
      );
    }

    tr.setMeta(ACTION_NEW_STATE, {
      tokens,
      error,
      query: ast,
      mapping,
      queryStr: queryAfterParse,
    });

    applyReadOnlyChipKeys(tr);

    return { queryResult, tr };
  };

  return new Plugin<PluginState>({
    key: cqlPluginKey,
    state: {
      init(_, state) {
        const queryStr = docToCqlStr(state.doc);
        return {
          tokens: [],
          suggestions: [],
          mapping: new Mapping(),
          queryStr,
          query: parseCqlStr(queryStr).query,
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
        const { queryResult, tr: newTr } = applyQueryToTr(newState.tr);

        tr = newTr;

        // @todo: this does not really belong here! Possibly in view? (Side effect)
        onChange({
          cqlQuery: docToCqlStr(tr.doc),
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
        [chipKey.name](node) {
          const dom = document.createElement("chip-key");
          const separator = document.createElement("Cql__chipKeySeparator");
          separator.setAttribute("contentEditable", "false");
          separator.innerText = ":";

          const contentDOM = document.createElement("span");
          contentDOM.classList.add("Cql__ChipWrapperContent");
          dom.appendChild(contentDOM);
          dom.appendChild(separator);
          if (node.attrs[IS_READ_ONLY]) {
            dom.classList.add(CLASS_CHIP_KEY_READONLY);
            dom.setAttribute("contenteditable", "false");
          }

          return {
            dom,
            contentDOM,
            update(node) {
              if (node.type !== chipKey) {
                return false;
              }

              if (node.attrs[IS_READ_ONLY]) {
                dom.classList.add(CLASS_CHIP_KEY_READONLY);
                dom.setAttribute("contenteditable", "false");
              } else {
                dom.classList.remove(CLASS_CHIP_KEY_READONLY);
                dom.setAttribute("contenteditable", "true");
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
            const { doc, selection } = view.state;
            const suffix = doc.textBetween(
              selection.from,
              Math.min(selection.to + 1, doc.nodeSize - 2)
            );
            const maybeTrailingWhitespace =
              selection.from === selection.to &&
              !["", " "].some((str) => suffix === str)
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
          case "Escape": {
            typeaheadPopover?.hide();
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

        // Typeahead-specific behaviours
        if (!typeaheadPopover?.isRenderingNavigableMenu()) {
          switch (event.key) {
            case "Enter": {
              return skipSuggestion(view)();
            }
            default: {
              return false;
            }
          }
        } else {
          switch (event.key) {
            case "ArrowUp": {
              return typeaheadPopover.handleAction("up");
            }
            case "ArrowDown": {
              return typeaheadPopover.handleAction("down");
            }
            case "ArrowLeft": {
              return typeaheadPopover.handleAction("left");
            }
            case "ArrowRight": {
              return typeaheadPopover.handleAction("right");
            }
            case "Enter": {
              return typeaheadPopover.handleAction("enter");
            }
          }
        }
      },
      // Serialise outgoing content to a CQL string for portability in both plain text and html
      clipboardTextSerializer(content) {
        const node = doc.create(undefined, content.content);
        const queryStr = docToCqlStr(node);
        return queryStr;
      },
      clipboardSerializer: {
        serializeFragment: (fragment: Fragment) => {
          const node = doc.create(undefined, fragment);
          const queryStr = docToCqlStr(node);
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
        applySuggestion(view),
        skipSuggestion(view)
      );

      errorPopover = new ErrorPopover(
        view,
        errorEl,
        errorMsgEl,
        jsonDebugContainer
      );

      // Set up initial document with parsed query

      const { tr, queryResult } = applyQueryToTr(view.state.tr);

      view.dispatch(tr);
      onChange({
        cqlQuery: docToCqlStr(tr.doc),
        query: queryResult ?? "",
      });

      return {
        async update(view) {
          const { error, query, mapping } = cqlPluginKey.getState(view.state)!;

          errorPopover?.updateErrorMessage(error);
          if (!query) {
            return;
          }

          if (
            [chip, chipKey, chipValue].includes(getNodeTypeAtSelection(view))
          ) {
            typeaheadPopover?.setIsPending();
          }

          try {
            const suggestions = await cqlService.fetchSuggestions(query);
            const mappedSuggestions = toMappedSuggestions(suggestions, mapping);
            typeaheadPopover?.updateItemsFromSuggestions(mappedSuggestions);

            if (debugSuggestionsContainer) {
              debugSuggestionsContainer.innerHTML = `
                  <h2>Typeahead</h2>
                      <p>Current selection: ${view.state.selection.from}-${
                        view.state.selection.to
                      }
                      </p>

                <div>${mappedSuggestions.map((suggestion) =>
                  JSON.stringify(suggestion, undefined, "  ")
                )}</div>`;
            }
          } catch (e) {
            if (!(e instanceof DOMException && e.name == "AbortError")) {
              throw e;
            }
          }
        },
      };
    },
  });
};
