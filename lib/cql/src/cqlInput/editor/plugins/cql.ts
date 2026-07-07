import { ChangeSet, Leaf, Node, Plot, Slice } from "wordgard/doc";
import { GardSelection, GardState, Transaction } from "wordgard/state";
import { selectAll } from "wordgard/command";
import {
  Decoration,
  KeyBinding,
  PointSet,
  RangeSet,
  Widget,
  Wordgard,
} from "wordgard/editor";

import { CqlQuery } from "../../../lang/ast";
import { createParser } from "../../../lang/Cql";
import { Typeahead } from "../../../lang/typeahead";
import { Token } from "../../../lang/token";
import { CqlConfig } from "../../CqlInput";
import { DebugChangeEventDetail } from "../../../types/dom";
import { defaultPopoverRenderer } from "../../popover/components/defaultPopoverRenderer";
import { ErrorPopover } from "../../popover/ErrorPopover";
import { TypeaheadPopover } from "../../popover/TypeaheadPopover";
import {
  handleColon,
  insertChip,
  maybeAddChipAtPolarityChar,
  mergeDocs,
  removeChipAdjacentToSelection,
  removeChipAtSelectionIfEmpty,
  skipSuggestion,
} from "../commands";
import {
  chipKeyTag,
  chipType,
  chipValueTag,
  queryStrTag,
  readOnlyMark,
  schema,
  selectedMark,
} from "../schema";
import {
  docToCqlStr,
  findNodeAt,
  getContentFromClipboard,
  getNextPositionAfterTypeaheadSelection,
  getNodeTypeAtSelection,
  getTokenTestId,
  isChipSelected,
  isSelectionWithinNodesOfType,
  mapResult,
  PosMapper,
  ProseMirrorToken,
  queryToProseMirrorDoc,
  tokensToDecorations,
  tokensToDoc,
  toMappedSuggestions,
} from "../utils";
import { chipViewExtensions } from "../nodeView";

export type CqlError = {
  position?: number;
  message: string;
};

type PluginState = {
  tokens: Token[];
  proseMirrorTokens: ProseMirrorToken[];
  queryAst: CqlQuery | undefined;
  error: CqlError | undefined;
  mapping: PosMapper;
};

/**
 * Annotation used to mark a transaction whose selection change should be
 * exempt from the read-only chip-key redirect (see the transaction extender
 * below). Defined at module scope because `commands.ts` reads it too.
 */
export const TRANSACTION_IGNORE_READONLY =
  Transaction.Annotation.define<boolean>();

export const CLASS_ERROR = "Cql__ErrorWidget";
export const CLASS_VISIBLE = "Cql--is-visible";
export const CLASS_CHIP_KEY_READONLY = "Cql__ChipKey--is-readonly";
export const CLASS_CHIP_SELECTED = "Cql__ChipWrapper--is-selected";

export { TEST_ID_POLARITY_HANDLE, TEST_ID_CHIP_VALUE } from "../nodeView";

/**
 * The widget displayed at the position of a parse error.
 */
const errorWidget = Widget.create({
  render: () => {
    const el = document.createElement("span");
    el.classList.add(CLASS_ERROR);
    return el;
  },
});

/**
 * The CQL plugin handles most aspects of the editor behaviour, including
 *  - fetching results from the language server, and applying them to the document
 *  - applying decorations for syntax highlighting
 *  - managing typeahead behaviour
 *  - rendering chips (via the chip decorations from nodeView)
 *  - handling clipboard (de)serialisation
 *  - managing custom keyboard and selection behaviour
 */
export const createCqlPlugin = ({
  typeahead,
  typeaheadEl,
  errorEl,
  onChange,
  onDebug,
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
  onDebug?: (detail: DebugChangeEventDetail) => void;
  parser: ReturnType<typeof createParser>;
}): GardState.Extension => {
  let typeaheadPopover: TypeaheadPopover | undefined;
  let errorPopover: ErrorPopover | undefined;

  // Annotations are scoped to this plugin instance so multiple editors do not
  // interfere with each other.
  const ACTION_NEW_STATE = Transaction.Annotation.define<PluginState>();
  const ACTION_SERVER_ERROR = Transaction.Annotation.define<string>();

  // ---------------------------------------------------------------------------
  // Parsing
  // ---------------------------------------------------------------------------

  /**
   * Parse the current document to CQL, run it through the parser, and return
   * both the resulting plugin state and the canonical document the query
   * produces.
   */
  const parseState = (
    docNode: Plot.Doc,
  ): { pluginState: PluginState; newDoc: Plot.Doc } => {
    const queryBeforeParse = docToCqlStr(docNode);
    const result = parser(queryBeforeParse);
    const { tokens, queryAst, error, mapping } = mapResult(result);
    const newDoc = tokensToDoc(tokens);

    return {
      pluginState: {
        tokens: result.tokens,
        proseMirrorTokens: tokens,
        error,
        queryAst,
        mapping,
      },
      newDoc,
    };
  };

  /**
   * Move the selection into the chip key when the previous edit implies the
   * user is now editing key content (e.g. they have just typed a polarity
   * character, or a trailing colon that should move them into the value).
   *
   * Replaces the ProseMirror `maybeMoveSelectionIntoChipKey` helper; here it is
   * expressed as a selection-producing function so it can run against the
   * document *after* the reparse changes have been applied.
   */
  const moveSelectionIntoChipKey = (
    selection: GardSelection,
    prevDoc: Plot.Doc,
    cx: GardSelection.Context,
  ): GardSelection => {
    const currentDoc = cx.doc;
    const defaultPos = Math.min(selection.from, currentDoc.length - 2);
    const defaultSelection = GardSelection.near(cx, Math.max(defaultPos, 0));

    if (selection.from > currentDoc.length || selection.from !== selection.to) {
      return defaultSelection;
    }

    const $from = currentDoc.resolve(selection.from);
    const charBeforeCaret = prevDoc.textContent({
      from: Math.max(selection.from - 1, 0),
      to: selection.from,
    });

    let nodeTypeToMoveTo: Node.Type | undefined;

    if ($from.parent.node.type === queryStrTag.type && charBeforeCaret === ":") {
      nodeTypeToMoveTo = chipValueTag.type;
    } else {
      const parentType = $from.parent.node.type;
      const afterType = $from.nodeAfter?.type;
      if (parentType === chipType || afterType === chipType) {
        nodeTypeToMoveTo = chipKeyTag.type;
      }
    }

    if (nodeTypeToMoveTo) {
      const nodePos = findNodeAt(selection.from, currentDoc, nodeTypeToMoveTo);
      if (nodePos !== -1) {
        return GardSelection.near(cx, nodePos + 1, 1);
      }
    }

    return defaultSelection;
  };

  /**
   * Produce a transaction spec that replaces the current document with the
   * canonical document its query produces, publishing the new plugin state.
   */
  const reparseSpec = (state: GardState): Transaction.Spec => {
    const { pluginState, newDoc } = parseState(state.doc);
    const mergeSpec = mergeDocs(newDoc)({ state }, null);

    if (mergeSpec === false) {
      return { annotations: ACTION_NEW_STATE.of(pluginState) };
    }

    const prevSelection = state.selection;
    const prevDoc = state.doc;

    return {
      ...mergeSpec,
      selection: (cx) => moveSelectionIntoChipKey(prevSelection, prevDoc, cx),
      annotations: ACTION_NEW_STATE.of(pluginState),
    };
  };

  // ---------------------------------------------------------------------------
  // Plugin state field
  // ---------------------------------------------------------------------------

  const cqlPluginField = GardState.Field.define<PluginState>({
    create(state) {
      const queryStrValue = docToCqlStr(state.doc);
      return {
        tokens: [],
        proseMirrorTokens: [],
        queryAst: parser(queryStrValue).queryAst,
        error: undefined,
        mapping: new PosMapper([]),
      };
    },
    update(value, tr) {
      const maybeError = tr.annotation(ACTION_SERVER_ERROR);
      if (maybeError !== undefined) {
        return {
          ...value,
          proseMirrorTokens: [],
          error: { message: maybeError },
        };
      }

      const maybeNewState = tr.annotation(ACTION_NEW_STATE);
      if (maybeNewState !== undefined) {
        return maybeNewState;
      }

      if (value.error && tr.docChanged) {
        return { ...value, error: undefined };
      }

      return value;
    },
    provide: (field) => [
      // Syntax-highlighting decorations.
      Decoration.Range.source.of((state) => {
        if (!syntaxHighlighting) {
          return RangeSet.empty;
        }
        const { proseMirrorTokens } = state.field(field);
        return RangeSet.create(
          tokensToDecorations(proseMirrorTokens).flatMap(
            ({ from, to, tokenType }): [number, number, Decoration.Range][] => [
              [
                from,
                to,
                Decoration.Range.attribute(
                  "class",
                  `CqlToken__${tokenType}`,
                  { scope: "all" },
                ),
              ],
              [
                from,
                to,
                Decoration.Range.attribute(
                  "data-testid",
                  getTokenTestId(tokenType),
                  { scope: "all" },
                ),
              ],
            ],
          ),
        );
      }),
      // Error widget decoration.
      Decoration.Point.source.of((state) => {
        const { error } = state.field(field);
        if (!error?.position) {
          return PointSet.empty;
        }
        return PointSet.create([
          [error.position, Decoration.Point.widget(errorWidget)],
        ]);
      }),
    ],
  });

  // ---------------------------------------------------------------------------
  // Transaction appender: reparse + chip lifecycle marks
  // ---------------------------------------------------------------------------

  /**
   * Re-parse the query when it has changed, replacing the document with its
   * canonical form. Skips when the batch already produced new plugin state, or
   * when the query string is unchanged (e.g. mark-only edits).
   */
  const maybeReparse = (
    trs: readonly Transaction[],
    state: GardState,
  ): Transaction.Spec | null => {
    if (trs.some((tr) => tr.annotation(ACTION_NEW_STATE) !== undefined)) {
      return null;
    }

    const prevQuery = docToCqlStr(trs[0].startState.doc);
    const currentQuery = docToCqlStr(state.doc);
    if (prevQuery === currentQuery) {
      return null;
    }

    return reparseSpec(state);
  };

  /**
   * Add the `selected` mark to chips fully covered by the selection, and
   * remove it from chips that are not. Idempotent.
   */
  const maybeSelectedMarks = (state: GardState): Transaction.Spec | null => {
    const { selection, doc } = state;
    const changes: ChangeSet.Change[] = [];

    doc.iterate((node, pos) => {
      if (node.type !== chipType) {
        return;
      }
      const covered =
        selection.from <= pos && selection.to >= pos + node.length;
      const selected = isChipSelected(node);
      if (covered && !selected) {
        changes.push({ from: pos, to: pos + node.length, add: selectedMark });
      } else if (!covered && selected) {
        changes.push({
          from: pos,
          to: pos + node.length,
          remove: selectedMark,
        });
      }
      return false;
    });

    return changes.length ? { changes } : null;
  };

  /**
   * Apply the chip read-only lifecycle: once a chip's value has content, or the
   * selection is within the value, the key becomes read-only and the value
   * becomes editable. Idempotent.
   */
  const maybeLifecycleMarks = (state: GardState): Transaction.Spec | null => {
    const {
      selection: { from, to },
      doc,
    } = state;
    const changes: ChangeSet.Change[] = [];

    doc.iterate((node, pos) => {
      if (node.type !== chipType) {
        return;
      }
      const chipPlot = node as Plot;
      const keyNode = chipPlot.firstChild;
      const valueNode = chipPlot.lastChild;
      if (!keyNode || !valueNode) {
        return false;
      }

      const keyStart = pos + 1;
      const valueStart = keyStart + keyNode.length;
      const valueEnd = valueStart + valueNode.length;
      const valueHasContent = !!(valueNode as Plot).textContent();
      const selectionCoversValue = from >= valueStart && to <= valueEnd;

      if (selectionCoversValue || valueHasContent) {
        if (keyNode.mark(readOnlyMark.type) === undefined) {
          changes.push({
            from: keyStart,
            to: keyStart + keyNode.length,
            add: readOnlyMark,
          });
        }
        if (valueNode.mark(readOnlyMark.type) !== undefined) {
          changes.push({
            from: valueStart,
            to: valueEnd,
            remove: readOnlyMark,
          });
        }
      }

      return false;
    });

    return changes.length ? { changes } : null;
  };

  const appender = (
    trs: readonly Transaction[],
    state: GardState,
  ): Transaction.Spec | null =>
    maybeReparse(trs, state) ??
    maybeSelectedMarks(state) ??
    maybeLifecycleMarks(state);

  // ---------------------------------------------------------------------------
  // Transaction extender: keep the caret out of read-only chip keys
  // ---------------------------------------------------------------------------

  const extender = (tr: Transaction): Transaction.Spec | null => {
    if (tr.annotation(TRANSACTION_IGNORE_READONLY)) {
      return null;
    }

    const node = isSelectionWithinNodesOfType(tr.newDoc, tr.newSelection, [
      chipKeyTag.type,
    ]);

    if (node && node.mark(readOnlyMark.type) !== undefined) {
      const cx: GardSelection.Context = {
        doc: tr.newDoc,
        config: tr.startState.config,
      };
      return { selection: GardSelection.near(cx, tr.newSelection.from) };
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // Custom keyboard behaviour
  // ---------------------------------------------------------------------------

  /**
   * Handle the Enter key when the caret is within a chip key: unwrap the chip,
   * inserting its key content back into the preceding query string.
   */
  const handleEnter = (wg: Wordgard): boolean | Transaction.Spec => {
    const { state } = wg;

    if (
      !isSelectionWithinNodesOfType(state.doc, state.selection, [
        chipKeyTag.type,
      ])
    ) {
      wg.focus();
      return skipSuggestion(wg, null);
    }

    const from = state.selection.from;
    let chipPos = -1;
    let chipNode: Plot | undefined;

    state.doc.iterate((node, pos) => {
      if (chipNode) {
        return false;
      }
      if (node.type === chipType && from > pos && from < pos + node.length) {
        chipPos = pos;
        chipNode = node as Plot;
      }
      return node.type === chipType ? false : undefined;
    });

    if (!chipNode || chipPos < 0) {
      return true;
    }

    const keyNode = chipNode.firstChild;
    const keyText = keyNode ? (keyNode as Plot).textContent() : "";
    const $chip = state.doc.resolve(chipPos);
    const precedingNode = $chip.nodeBefore;
    const precedingIsNonEmptyQueryStr =
      precedingNode?.type === queryStrTag.type &&
      (precedingNode as Plot).textContent() !== "";
    const maybeWhitespace = precedingIsNonEmptyQueryStr ? " " : "";
    const polarity = chipNode.tag.param === "-" ? "-" : "";
    const insertText = `${maybeWhitespace}${polarity}${keyText}`;

    const chipStart = chipPos;
    const chipEnd = chipPos + chipNode.length;
    const insertPos = Math.max(chipStart - 1, 0);

    wg.dispatch({
      changes: {
        correct: [
          { from: insertPos, to: insertPos, insert: [Leaf.text(insertText)] },
          { from: chipStart, to: chipEnd, insert: [] },
        ],
      },
    });

    return true;
  };

  const keyBindings: KeyBinding[] = [
    KeyBinding.of({
      char: "+",
      allowDefault: true,
      run: (wg) => maybeAddChipAtPolarityChar("+")(wg, null),
    }),
    KeyBinding.of({
      char: "-",
      allowDefault: true,
      run: (wg) => maybeAddChipAtPolarityChar("-")(wg, null),
    }),
    KeyBinding.of({
      char: ":",
      allowDefault: true,
      run: (wg) => handleColon(wg, null),
    }),
    KeyBinding.of({
      key: "Escape",
      run: () => {
        typeaheadPopover?.hide();
        return true;
      },
    }),
    KeyBinding.of({
      key: "Delete",
      run: (wg) =>
        removeChipAtSelectionIfEmpty(wg, null) ||
        removeChipAdjacentToSelection(true)(wg, null),
    }),
    KeyBinding.of({
      key: "Backspace",
      run: (wg) =>
        removeChipAtSelectionIfEmpty(wg, null) ||
        removeChipAdjacentToSelection(false)(wg, null),
    }),
    KeyBinding.of({
      key: "Enter",
      run: (wg) => {
        if (typeaheadPopover?.isRenderingNavigableMenu()) {
          return typeaheadPopover.handleAction("enter") === true;
        }
        return handleEnter(wg);
      },
    }),
    KeyBinding.of({
      key: "ArrowUp",
      run: () => typeaheadPopover?.handleAction("up") === true,
    }),
    KeyBinding.of({
      key: "ArrowDown",
      run: () => typeaheadPopover?.handleAction("down") === true,
    }),
    KeyBinding.of({
      key: "ArrowLeft",
      run: () =>
        typeaheadPopover?.isRenderingNavigableMenu()
          ? typeaheadPopover.handleAction("left") === true
          : false,
    }),
    KeyBinding.of({
      key: "ArrowRight",
      run: () =>
        typeaheadPopover?.isRenderingNavigableMenu()
          ? typeaheadPopover.handleAction("right") === true
          : false,
    }),
    ...Object.entries(lang?.shortcuts ?? {}).map(([key, field]) =>
      KeyBinding.of({
        key,
        run: (wg: Wordgard) => {
          if (getNodeTypeAtSelection(wg.state) !== queryStrTag.type) {
            return false;
          }
          return insertChip("+", field)(wg, null);
        },
      }),
    ),
  ];

  // ---------------------------------------------------------------------------
  // Typeahead callbacks
  // ---------------------------------------------------------------------------

  const applySuggestion =
    (wg: Wordgard) => (from: number, to: number, value: string) => {
      wg.dispatch({
        changes: { from, to, insert: [Leaf.text(value)], fit: true },
      });

      const insertPos = getNextPositionAfterTypeaheadSelection(
        wg.state.doc,
        from,
      );
      if (insertPos !== undefined) {
        wg.dispatch({
          selection: GardSelection.cursor(insertPos),
          annotations: TRANSACTION_IGNORE_READONLY.of(true),
        });
      }

      wg.focus();
    };

  const skipSuggestionAndFocus = (wg: Wordgard) => () => {
    const spec = skipSuggestion(wg, null);
    if (spec) {
      wg.dispatch(spec);
    }
    wg.focus();
  };

  // ---------------------------------------------------------------------------
  // Clipboard (de)serialisation
  // ---------------------------------------------------------------------------

  const serializeSlice = (slice: Slice): string | null => {
    try {
      const node = schema.doc(slice.content as unknown as Node[]);
      const chipValuePos = findNodeAt(0, node, chipValueTag.type);
      const chipKeyPos = findNodeAt(0, node, chipKeyTag.type);
      if (chipValuePos > -1 && chipKeyPos === -1) {
        const cv = node.nodeAt(chipValuePos);
        return cv ? (cv as Plot).textContent() : "";
      }
      return docToCqlStr(node);
    } catch {
      return slice.textContent();
    }
  };

  const handlePaste = (wg: Wordgard, event: ClipboardEvent): boolean => {
    const maybeContent = getContentFromClipboard(event);
    if (!maybeContent || maybeContent.type === "HTML") {
      return false;
    }

    const { content } = maybeContent;
    const { from, to } = wg.state.selection;
    const fromNode = wg.state.doc.resolve(from).parent.node;
    const toNode = wg.state.doc.resolve(to).parent.node;
    const withinChipValue =
      fromNode.type === chipValueTag.type && fromNode === toNode;

    if (withinChipValue) {
      wg.dispatch({
        changes: { from, to, insert: [Leaf.text(content)], fit: true },
      });
      return true;
    }

    const docToInsert = queryToProseMirrorDoc(content, parser);
    wg.dispatch({
      changes: {
        from,
        to,
        insert: docToInsert.slice(1, docToInsert.length - 1),
        fit: true,
      },
    });
    return true;
  };

  // ---------------------------------------------------------------------------
  // Popover view plugin
  // ---------------------------------------------------------------------------

  const cqlPlugin = Wordgard.Plugin.define((wg) => {
    typeaheadPopover = new TypeaheadPopover(
      wg,
      typeaheadEl,
      applySuggestion(wg),
      skipSuggestionAndFocus(wg),
      renderPopoverContent,
    );
    errorPopover = new ErrorPopover(wg, errorEl);

    // Canonicalise the initial document and publish the initial plugin state.
    wg.dispatch(reparseSpec(wg.state));
    onChange({ queryAst: wg.state.field(cqlPluginField).queryAst });

    return {
      update(update: Wordgard.Update) {
        const { state } = update;
        const { error, queryAst, mapping, tokens } =
          state.field(cqlPluginField);

        if (onDebug) {
          onDebug({
            queryStr: docToCqlStr(state.doc),
            selection: state.selection,
            doc: state.doc,
            tokens,
            mapping,
            queryAst,
            error,
          });
        }

        errorPopover?.updateErrorMessage(error);
        onChange({ queryAst, error: error?.message });

        if (!queryAst) {
          return;
        }

        const typeaheadNodeTypes: Node.Type[] = [
          chipType,
          chipKeyTag.type,
          chipValueTag.type,
        ];
        if (typeaheadNodeTypes.includes(getNodeTypeAtSelection(state))) {
          typeaheadPopover?.setIsPending();
        }

        typeahead
          .getSuggestions(queryAst)
          .then((suggestions) => {
            if (wg.hasFocus) {
              typeaheadPopover?.updateSuggestions(
                toMappedSuggestions(suggestions, mapping),
              );
            }
          })
          .catch((e) => {
            if (!(e instanceof DOMException && e.name === "AbortError")) {
              throw e;
            }
          });
      },
      disconnect() {
        typeaheadPopover?.hide();
        errorPopover?.hideErrorMessages();
      },
    };
  });

  // ---------------------------------------------------------------------------
  // Assemble the extension
  // ---------------------------------------------------------------------------

  return [
    cqlPluginField,
    Transaction.appender.of(appender),
    Transaction.extender.of(extender),
    chipViewExtensions,
    ...keyBindings,
    Wordgard.domEventHandler("blur", (_event, wg) => {
      wg.dispatch({ selection: GardSelection.near(wg.state, 0) });
      return false;
    }),
    Wordgard.domEventHandler("dblclick", (event, wg) => {
      if (event.target === wg.contentDOM || event.target === wg.dom) {
        const spec = selectAll(wg, null);
        if (spec) {
          wg.dispatch(spec);
        }
      }
      return false;
    }),
    Wordgard.clipboardTextSerializer.of((slice) => serializeSlice(slice)),
    Wordgard.pasteHandler.of((wg, event) => handlePaste(wg, event)),
    cqlPlugin,
  ];
};
