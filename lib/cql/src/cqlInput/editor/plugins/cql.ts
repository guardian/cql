import { Node } from "prosemirror-model";
import {
  AllSelection,
  Plugin,
  PluginKey,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import { Mapping } from "prosemirror-transform";
import { DecorationSet } from "prosemirror-view";
import { CqlQuery } from "../../../lang/ast";
import { createParser } from "../../../lang/Cql";
import { Typeahead } from "../../../lang/typeahead";
import { CqlConfig } from "../../CqlInput";
import { defaultPopoverRenderer } from "../../popover/components/defaultPopoverRenderer";
import { ErrorPopover } from "../../popover/ErrorPopover";
import { TypeaheadPopover } from "../../popover/TypeaheadPopover";
import { insertChip, mergeDocs } from "../commands";
import {
  chip,
  chipKey,
  chipValue,
  DELETE_CHIP_INTENT,
  doc,
  IS_READ_ONLY,
  IS_SELECTED,
  queryStr,
} from "../schema";
import {
  applyChipLifecycleRules,
  applyDeleteIntent,
  applySuggestion,
  docToCqlStr,
  errorToDecoration,
  getContentFromClipboard,
  getNodeTypeAtSelection,
  isChipSelected,
  isSelectionWithinNodesOfType,
  mapResult,
  maybeMoveSelectionIntoChipKey,
  ProseMirrorToken,
  queryHasChanged,
  queryToProseMirrorDoc,
  removeChipAtSelectionIfEmpty,
  skipSuggestion,
  tokensToDecorations,
  tokensToDoc,
  toMappedSuggestions,
} from "../utils";
import { chipKeyNodeView, chipNodeView, chipValueNodeView } from "../nodeView";

const cqlPluginKey = new PluginKey<PluginState>("cql-plugin");

export type CqlError = {
  position?: number;
  message: string;
};

type PluginState = {
  tokens: ProseMirrorToken[];
  queryAst: CqlQuery | undefined;
  error: CqlError | undefined;
  mapping: Mapping;
};

const ACTION_NEW_STATE = "NEW_STATE";
const ACTION_SERVER_ERROR = "SERVER_ERROR";

export const TRANSACTION_IGNORE_READONLY = "TRANSACTION_IGNORE_READONLY";

export const CLASS_ERROR = "Cql__ErrorWidget";
export const CLASS_VISIBLE = "Cql--is-visible";
export const CLASS_CHIP_KEY_READONLY = "Cql__ChipKey--is-readonly";
export const CLASS_CHIP_SELECTED = "Cql__ChipWrapper--is-selected";

export const TEST_ID_POLARITY_HANDLE = "polarity-handle";
export const TEST_ID_CHIP_VALUE = "chip-value";

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
    renderPopoverContent = defaultPopoverRenderer,
    lang,
  },
  parser,
}: {
  typeahead: Typeahead;
  typeaheadEl: HTMLElement;
  errorEl: HTMLElement;
  config: CqlConfig;
  onChange: (detail: { queryAst?: CqlQuery; error?: string }) => void;
  parser: ReturnType<typeof createParser>;
}) => {
  let typeaheadPopover: TypeaheadPopover | undefined;
  let errorPopover: ErrorPopover | undefined;

  /**
   * Replaces the current document with the query it produces on parse.
   *
   * Side-effects: mutates the given transaction, and re-applies debug UI if provided.
   */
  const applyQueryToTr = (tr: Transaction) => {
    const originalDoc = tr.doc;
    const queryBeforeParse = docToCqlStr(originalDoc);

    const result = parser(queryBeforeParse);
    const { tokens, queryAst, error, mapping } = mapResult(result);

    const newDoc = tokensToDoc(tokens);

    const docSelection = new AllSelection(tr.doc);

    if (!newDoc.eq(tr.doc)) {
      const originalSelection = tr.selection;
      tr.replaceWith(docSelection.from, docSelection.to, newDoc).setSelection(
        maybeMoveSelectionIntoChipKey({
          selection: originalSelection,
          prevDoc: originalDoc,
          currentDoc: tr.doc,
        }),
      );
    }

    tr.setMeta(ACTION_NEW_STATE, {
      tokens,
      error,
      queryAst,
      mapping,
    });

    return { queryAst, tr };
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
          queryAst: parser(queryStr).queryAst,
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
      if (tr.getMeta(TRANSACTION_IGNORE_READONLY)) {
        return true;
      }

      // Do not permit selections within chip keys if they are readonly. We do
      // permit selections within chip values at the transaction level, because
      // if we do not, the caret cannot pass 'over' a chip value out of a chip
      // when the user hits ArrowRight. Making chip values'
      // `contenteditable=false` and preventing pointer-events is enough to
      // prevent users from selecting a position within them (unlike chip keys,
      // where a range selection is possible on content)
      const node = isSelectionWithinNodesOfType(tr.doc, tr.selection, [
        chipKey,
      ]);

      if (node?.attrs[IS_READ_ONLY]) {
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

      applyChipLifecycleRules(tr);

      return tr;
    },
    props: {
      nodeViews: {
        [chip.name]: chipNodeView,
        [chipKey.name]: chipKeyNodeView,
        [chipValue.name]: chipValueNodeView,
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
          case "Escape": {
            typeaheadPopover?.hide();
            return true;
          }
          case "Delete": {
            if (removeChipAtSelectionIfEmpty(view)) {
              return true;
            }

            // Look forward for a chip to remove
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
            if (removeChipAtSelectionIfEmpty(view)) {
              return true;
            }

            // Look backward for a chip to remove
            const { anchor } = view.state.selection;
            const positionBeforeSearchText = Math.max(anchor - 1, 0);
            const $prevPos = view.state.doc.resolve(positionBeforeSearchText);
            const prevNode = $prevPos.nodeBefore;

            if (!prevNode) {
              return false;
            }

            const prevNodePos = $prevPos.pos - prevNode.nodeSize;

            return applyDeleteIntent(
              view,
              prevNodePos,
              $prevPos.pos + 1,
              prevNode,
            );
          }
        }

        // Shortcuts
        const $selFrom = view.state.selection.$from;
        const isInQueryStr = $selFrom.node().type === queryStr;
        if (lang?.shortcuts?.[event.key] && isInQueryStr) {
          return insertChip(lang?.shortcuts?.[event.key])(
            view.state,
            view.dispatch,
          );
        }

        // Typeahead-specific behaviours
        if (!typeaheadPopover?.isRenderingNavigableMenu()) {
          switch (event.key) {
            case "Enter": {
              return skipSuggestion(view)();
            }
            case "ArrowUp":
            case "ArrowDown":
              return typeaheadPopover?.handleAction(KeyToActionMap[event.key]);
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
      handleDOMEvents: {
        blur: (view) => {
          view.dispatch(
            view.state.tr.setSelection(
              TextSelection.near(view.state.doc.resolve(0)),
            ),
          );
        },
      },
      /**
       * Handle pasting text manually, to ensure that selection state is
       * preserved. Without this, expanding pasted string content into chip keys
       * and values causes us to lose selection state.
       */
      handlePaste(view, event) {
        const maybeContent = getContentFromClipboard(event);

        if (!maybeContent || maybeContent?.type === "HTML") {
          return false;
        }

        // Create the document that pasting would produce
        const docToInsert = queryToProseMirrorDoc(maybeContent.content, parser);
        const { tr } = view.state;
        const { from, to } = view.state.selection;
        const newState = view.state.apply(
          tr.replaceRange(from, to, docToInsert.slice(0)),
        );

        // Merge it with the current document, producing a minimal diff to
        // preserve selection state
        mergeDocs(newState.doc)(view.state, view.dispatch);

        return true;
      },
      handleDoubleClick(view) {
        view.dispatch(
          view.state.tr.setSelection(new AllSelection(view.state.doc)),
        );
      },
      // Serialise outgoing content to a CQL string for portability in both plain text and html
      clipboardTextSerializer(content) {
        const node = doc.create(undefined, content.content);
        return docToCqlStr(node);
      },
    },
    view(view) {
      typeaheadPopover = new TypeaheadPopover(
        view,
        typeaheadEl,
        applySuggestion(view),
        skipSuggestion(view),
        renderPopoverContent,
      );

      errorPopover = new ErrorPopover(view, errorEl);

      // Set up initial document with parsed query
      const { tr, queryAst } = applyQueryToTr(view.state.tr);
      view.dispatch(tr);

      onChange({
        queryAst,
      });

      return {
        async update(view) {
          const { error, queryAst, mapping } = cqlPluginKey.getState(
            view.state,
          )!;

          errorPopover?.updateErrorMessage(error);

          onChange({
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
              typeaheadPopover?.updateSuggestions(mappedSuggestions);
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
