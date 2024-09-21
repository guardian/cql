import { DecorationSet } from "prosemirror-view";
import { CqlError, CqlServiceInterface } from "../services/CqlService";
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
  getErrorMessage,
  mapResult,
} from "./utils";
import { Mapping } from "prosemirror-transform";
import { TypeaheadPopover } from "./TypeaheadPopover";
import { DELETE_CHIP_INTENT, chipWrapper, doc, schema } from "./schema";
import { DOMSerializer, Fragment } from "prosemirror-model";
import { QueryChangeEventDetail } from "./dom";
import { ErrorPopover } from "./ErrorPopover";
import { MappedTypeaheadSuggestion } from "../lang/types";
import { CqlConfig } from "./CqlInput";

const cqlPluginKey = new PluginKey<PluginState>("cql-plugin");

type PluginState = {
  tokens: ProseMirrorToken[];
  suggestions: MappedTypeaheadSuggestion[];
  error: CqlError | undefined;
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
  if (debugEl) {
    debugTokenContainer = document.createElement("div");
    debugEl.appendChild(debugTokenContainer);
    debugASTContainer = document.createElement("div");
    debugEl.appendChild(debugASTContainer);
  }

  return new Plugin<PluginState>({
    key: cqlPluginKey,
    state: {
      init() {
        return {
          tokens: [],
          suggestions: [],
          mapping: new Mapping(),
          error: undefined,
        };
      },
      apply(tr, { tokens, suggestions, error }) {
        const maybeError: string | undefined = tr.getMeta(ACTION_SERVER_ERROR);
        if (maybeError) {
          return {
            tokens: [],
            suggestions,
            error: { message: maybeError },
          };
        }

        const maybeNewState: PluginState | undefined =
          tr.getMeta(ACTION_NEW_STATE);

        return {
          tokens: maybeNewState ? maybeNewState.tokens : tokens,
          suggestions: maybeNewState ? maybeNewState.suggestions : suggestions,
          error: maybeNewState
            ? maybeNewState.error
            : // Remove the error state if the document changes – the document may be
            // valid, and the server will report if it is not
            !tr.docChanged
            ? error
            : undefined,
        };
      },
    },
    appendTransaction(_, oldState, newState) {
      let tr: Transaction | undefined;

      // If the selection has changed, reset any chips that are pending delete
      if (!oldState.selection.eq(newState.selection)) {
        const posOfChipWrappersToReset: number[] = [];
        newState.doc.descendants((node, pos) => {
          if (node.type === chipWrapper && node.attrs[DELETE_CHIP_INTENT]) {
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
        [chipWrapper.name](initialNode, view, getPos) {
          const handleDeleteClickEvent = () => {
            const pos = getPos();
            if (!pos) {
              return;
            }
            const node = view.state.doc.resolve(pos).nodeAfter;
            if (!node) {
              return;
            }
            applyDeleteIntent(view, pos, pos + node.nodeSize, node);
          };

          const dom = document.createElement("chip-wrapper");
          const contentDOM = document.createElement("span");
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
        switch (event.code) {
          // What should the behaviour of tab be?
          case "Tab":
            if (event.shiftKey) {
              // Reverse tab
              return true;
            }
            return true;
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
      typeaheadPopover = new TypeaheadPopover(view, typeaheadEl, debugEl);
      errorPopover = new ErrorPopover(view, errorEl, errorMsgEl, debugEl);

      const fetchQueryAndUpdateDoc = async (
        query: string,
        shouldWrapSelectionInKey: boolean = false
      ) => {
        try {
          cqlService.cancel();

          const result = await cqlService.fetchResult(query);
          const { tokens, suggestions, ast, error, queryResult } =
            mapResult(result);

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

          const userSelection = view.state.selection;
          const docSelection = new AllSelection(view.state.doc);
          const tr = view.state.tr;

          if (!newDoc.eq(view.state.doc)) {
            tr.replaceWith(
              docSelection.from,
              docSelection.to,
              newDoc
            ).setSelection(
              getNewSelection(userSelection, shouldWrapSelectionInKey, tr.doc)
            );
          }

          tr.setMeta(ACTION_NEW_STATE, { tokens, suggestions, error });

          onChange({
            cqlQuery: docToQueryStr(newDoc),
            query: queryResult ?? "",
          });

          view.dispatch(tr);
        } catch (e) {
          // Ignore aborts
          if (e instanceof DOMException && e?.name === "AbortError") {
            return;
          }

          const tr = view.state.tr;
          tr.setMeta(ACTION_SERVER_ERROR, `Error: ${getErrorMessage(e)}`);
          view.dispatch(tr);
        }
      };

      fetchQueryAndUpdateDoc(docToQueryStr(view.state.doc));

      return {
        update(view, prevState) {
          const prevQuery = docToQueryStr(prevState.doc);
          const { suggestions = [], error } = cqlPluginKey.getState(
            view.state
          )!;

          const currentQuery = docToQueryStr(view.state.doc);

          typeaheadPopover?.updateItemsFromSuggestions(suggestions);
          errorPopover?.updateErrorMessage(error);

          if (prevQuery.trim() === currentQuery.trim()) {
            return;
          }

          const shouldWrapSelectionInKey = isBeginningKeyValPair(
            prevQuery,
            currentQuery
          );

          fetchQueryAndUpdateDoc(currentQuery, shouldWrapSelectionInKey);
        },
      };
    },
  });
};
