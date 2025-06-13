import { DecorationSet } from "prosemirror-view";
import {
  AllSelection,
  NodeSelection,
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
  isChipSelected,
} from "../utils";
import { Mapping } from "prosemirror-transform";
import { TypeaheadPopover } from "../../popover/TypeaheadPopover";
import {
  chip,
  chipKey,
  chipValue,
  DELETE_CHIP_INTENT,
  doc,
  IS_READ_ONLY,
  IS_SELECTED,
  POLARITY,
  schema,
} from "../schema";
import { DOMSerializer, Fragment, Node } from "prosemirror-model";
import { QueryChangeEventDetail } from "../../../types/dom";
import { ErrorPopover } from "../../popover/ErrorPopover";
import { CqlConfig } from "../../CqlInput";
import {
  getDebugASTHTML,
  getDebugMappingHTML,
  getDebugTokenHTML,
  getOriginalQueryHTML,
} from "../debug";
import { CqlQuery } from "../../../lang/ast";
import { parseCqlStr } from "../../../lang/Cql";
import { Typeahead } from "../../../lang/typeahead";
import { defaultPopoverRenderer } from "../../popover/components/defaultPopoverRenderer";

const cqlPluginKey = new PluginKey<PluginState>("cql-plugin");

export type CqlError = {
  position?: number;
  message: string;
};

type PluginState = {
  tokens: ProseMirrorToken[];
  queryStr: string;
  queryAst: CqlQuery | undefined;
  error: CqlError | undefined;
  mapping: Mapping;
};

const ACTION_NEW_STATE = "NEW_STATE";
const ACTION_SERVER_ERROR = "SERVER_ERROR";

export const CLASS_ERROR = "Cql__ErrorWidget";
export const CLASS_VISIBLE = "Cql--is-visible";
export const CLASS_CHIP_KEY_READONLY = "Cql__ChipKey--is-readonly";
export const CLASS_CHIP_SELECTED = "Cql__ChipWrapper--is-selected";

export const DATA_CHIP_SELECTED = "data-cql-chip-selected";
export const TEST_ID_POLARITY_HANDLE = "polarity-handle";

const KeyToActionMap = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  Enter: "enter",
} as const;

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
  typeahead,
  typeaheadEl,
  errorEl,
  onChange,
  config: {
    syntaxHighlighting,
    debugEl,
    renderPopoverContent = defaultPopoverRenderer,
    lang,
  },
}: {
  typeahead: Typeahead;
  typeaheadEl: HTMLElement;
  errorEl: HTMLElement;
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

    const result = parseCqlStr(queryBeforeParse, lang);
    const { tokens, queryAst, error, mapping, queryStr } = mapResult(result);

    const newDoc = tokensToDoc(tokens);
    const queryAfterParse = docToCqlStr(newDoc); // The document may have changed as a result of the parse.

    if (debugASTContainer) {
      debugASTContainer.innerHTML = `<h2>AST</h2><div>${JSON.stringify(
        queryAst,
        undefined,
        "  ",
      )}</div>`;
    }
    if (debugTokenContainer) {
      debugTokenContainer.innerHTML = `<h2>Tokens</h2><div>${JSON.stringify(
        tokens,
        undefined,
        "  ",
      )}</div>`;
    }

    if (debugMappingContainer) {
      debugMappingContainer.innerHTML = `
            <p>Original query: </p>
            ${getOriginalQueryHTML(queryAfterParse)}
            <p>Tokenises to:</p>
            ${getDebugTokenHTML(result.tokens)}
            ${
              result.queryAst
                ? `<p>AST: </p>
            ${getDebugASTHTML(result.queryAst)}`
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
        }),
      );
    }

    tr.setMeta(ACTION_NEW_STATE, {
      tokens,
      error,
      queryAst,
      mapping,
      queryStr: queryAfterParse,
    });

    applyReadOnlyChipKeys(tr);

    return { queryStr: queryStr ?? "", queryAst, tr };
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
          queryAst: parseCqlStr(queryStr).queryAst,
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
    filterTransaction(tr) {
      // Do not permit NodeSelections that cover chip keys — they're readonly
      if (
        tr.selection instanceof NodeSelection &&
        tr.selection.node.type === chipKey
      ) {
        return false;
      }
      return true;
    },
    appendTransaction(_, oldState, newState) {
      let tr = newState.tr;

      // If the selection entirely covers any chipWrappers, mark them as selected, and vice-versa.
      const selectedChipNodeToPos = new Map<Node, number>();

      // Find all the nodes within the current selection.
      newState.doc.nodesBetween(
        newState.selection.from,
        newState.selection.to,
        (node, pos) => {
          if (
            node.type === chip &&
            newState.selection.from <= pos &&
            newState.selection.to >= pos + node.nodeSize
          ) {
            selectedChipNodeToPos.set(node, pos);
            return false;
          }
        },
      );

      // Update every relevant node with the new selection state
      newState.doc.descendants((node, pos) => {
        const isCurrentlySelected =
          selectedChipNodeToPos.get(node) !== undefined;
        const shouldUpdateNode =
          (isChipSelected(node) && !isCurrentlySelected) ||
          (!isChipSelected(node) && isCurrentlySelected);

        if (shouldUpdateNode) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            [IS_SELECTED]: isCurrentlySelected,
          });
        }

        // Do not descend into chip children
        if (node.type === chipKey) {
          return false;
        }
      });

      const maybeQueries = queryHasChanged(oldState.doc, newState.doc);

      if (maybeQueries) {
        const { tr: newTr } = applyQueryToTr(newState.tr);
        tr = newTr;
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
        }
      }

      return tr;
    },
    props: {
      nodeViews: {
        [chip.name](initialNode, view, getPos) {
          const getNodeAtPos = (): { node: Node; pos: number } | undefined => {
            const pos = getPos();
            if (!pos) {
              return;
            }

            const $pos = view.state.doc.resolve(pos);
            const node = $pos.nodeAfter;

            return node ? { node, pos } : undefined;
          };

          const handleDeleteClickEvent = () => {
            const result = getNodeAtPos();

            if (!result) {
              return;
            }

            const { node, pos } = result;

            applyDeleteIntent(view, pos, pos + node.nodeSize + 1, node);
          };

          const handlePolarityClickEvent = () => {
            const result = getNodeAtPos();

            if (!result) {
              return;
            }
            const newPolarity = result.node.attrs[POLARITY] === "+" ? "-" : "+";
            view.dispatch(
              view.state.tr.setNodeAttribute(result.pos, POLARITY, newPolarity),
            );
          };

          const dom = document.createElement("chip-wrapper");
          const contentDOM = document.createElement("span");
          contentDOM.classList.add("Cql__ChipWrapperContent");
          const polarityHandle = document.createElement("span");
          polarityHandle.classList.add("Cql__ChipWrapperPolarityHandle");
          polarityHandle.setAttribute("data-testid", TEST_ID_POLARITY_HANDLE);
          polarityHandle.setAttribute("contentEditable", "false");
          polarityHandle.innerHTML = initialNode.attrs[POLARITY];
          polarityHandle.addEventListener("click", handlePolarityClickEvent);

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

              polarityHandle.innerHTML = node.attrs[POLARITY];

              if (node.attrs[IS_SELECTED]) {
                dom.classList.add("Cql__ChipWrapper--is-selected");
              } else {
                dom.classList.remove("Cql__ChipWrapper--is-selected");
              }

              return true;
            },
          };
        },
        [chipKey.name](node) {
          const dom = document.createElement("chip-key");
          const separator = document.createElement("span");
          separator.classList.add("Cql__ChipKeySeparator");
          separator.setAttribute("contentEditable", "false");
          separator.innerText = ":";

          const contentDOM = document.createElement("span");
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
              Math.min(selection.to + 1, doc.nodeSize - 2),
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
              nextNode,
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
            case "ArrowUp":
            case "ArrowDown":
            case "ArrowLeft":
            case "ArrowRight":
            case "Enter": {
              event.stopPropagation();
              return typeaheadPopover.handleAction(KeyToActionMap[event.key]);
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
            schema.text(queryStr),
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
        skipSuggestion(view),
        renderPopoverContent,
      );

      errorPopover = new ErrorPopover(view, errorEl, jsonDebugContainer);

      // Set up initial document with parsed query
      const { tr, queryStr, queryAst } = applyQueryToTr(view.state.tr);
      view.dispatch(tr);

      onChange({
        queryStr,
        queryAst,
      });

      return {
        async update(view) {
          const { error, queryAst, queryStr, mapping } = cqlPluginKey.getState(
            view.state,
          )!;

          errorPopover?.updateErrorMessage(error);

          onChange({
            queryStr,
            queryAst,
            error: error?.message,
          });

          if (!queryAst) {
            return;
          }

          if (
            [chip, chipKey, chipValue].includes(getNodeTypeAtSelection(view))
          ) {
            typeaheadPopover?.setIsPending();
          }

          try {
            const suggestions = await typeahead.getSuggestions(queryAst);
            const mappedSuggestions = toMappedSuggestions(suggestions, mapping);
            if (view.hasFocus()) {
              typeaheadPopover?.updateItemsFromSuggestions(mappedSuggestions);
            }

            if (debugSuggestionsContainer) {
              debugSuggestionsContainer.innerHTML = `
                  <h2>Typeahead</h2>
                      <p>Current selection: ${view.state.selection.from}-${
                        view.state.selection.to
                      }
                      </p>

                <div>${mappedSuggestions.map((suggestion) =>
                  JSON.stringify(suggestion, undefined, "  "),
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
