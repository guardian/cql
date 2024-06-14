import { DecorationSet } from "prosemirror-view";
import { CqlService } from "../CqlService";
import { AllSelection, Plugin, PluginKey } from "prosemirror-state";
import {
  getNewSelection,
  isBeginningKeyValPair,
  logNode,
  createTokenMap,
  queryStrFromDoc,
  tokensToDecorations,
  tokensToNodes,
  toProseMirrorTokens,
  ProseMirrorToken,
  findNodeAt,
} from "./utils";
import { chip } from "./schema";

const cqlPluginKey = new PluginKey<PluginState>("cql-plugin");

export type SelectionAnchor = { from: number; to: number };

type PluginState = {
  queryStr?: string;
  tokens: ProseMirrorToken[];
};

const NEW_TOKENS = "NEW_TOKENS";

export const createCqlPlugin = (
  cqlService: CqlService,
  popoverEl: HTMLElement
) =>
  new Plugin<PluginState>({
    key: cqlPluginKey,
    state: {
      init(config) {
        const queryStr = config.doc ? queryStrFromDoc(config.doc) : undefined;
        return {
          queryStr,
          tokens: [],
          selectionAnchor: undefined,
          decorations: DecorationSet.empty,
        };
      },
      apply(tr, pluginState, _, newState) {
        const maybeNewTokens: ProseMirrorToken[] | undefined =
          tr.getMeta(NEW_TOKENS);

        return {
          queryStr: queryStrFromDoc(newState.doc),
          tokens: maybeNewTokens ?? pluginState.tokens,
        };
      },
    },
    props: {
      decorations: (state) => {
        const { tokens } = cqlPluginKey.getState(state)!;

        return DecorationSet.create(state.doc, tokensToDecorations(tokens));
      },
    },
    view(view) {
      const updateView = async (
        query: string,
        shouldWrapSelectionInKey: boolean = false
      ) => {
        const { tokens: _tokens, suggestions } = await cqlService.fetchResult(
          query
        );
        const tokens = toProseMirrorTokens(_tokens);
        const newDoc = tokensToNodes(tokens);
        console.log(JSON.stringify(tokens, undefined, " "));
        logNode(newDoc);
        const userSelection = view.state.selection;
        const docSelection = new AllSelection(view.state.doc);
        const tr = view.state.tr;

        tr.replaceWith(docSelection.from, docSelection.to, newDoc)
          .setSelection(
            getNewSelection(userSelection, shouldWrapSelectionInKey, tr.doc)
          )
          .setMeta(NEW_TOKENS, tokens);

        view.dispatch(tr);

        if (suggestions.length && tr.selection.from === tr.selection.to) {
          const mapping = createTokenMap(tokens);

          const suggestion = suggestions
            .map((suggestion) => {
              const start = mapping.map(suggestion.from);
              const end = mapping.map(suggestion.to);
              return { ...suggestion, from: start, to: end };
            })
            .find(
              ({ from, to, suggestions }) =>
                view.state.selection.from >= from &&
                view.state.selection.to <= to &&
                !!suggestions.TextSuggestion
            );

          if (suggestion) {
            const { from, suggestions } = suggestion;
            const chipPos = findNodeAt(from, view.state.doc, chip);
            const domSelectionAnchor = view.nodeDOM(chipPos) as HTMLElement;
            const { left } = domSelectionAnchor.getBoundingClientRect();
            popoverEl.style.left = `${left}px`;

            if (suggestions.TextSuggestion) {
              popoverEl.innerHTML = suggestions.TextSuggestion.suggestions
                .map(({ label, value }) => {
                  return `<div data-value="${value}">${label}</div>`;
                })
                .join("");
            }
          }
          popoverEl.showPopover();
        } else {
          popoverEl.hidePopover();
          popoverEl.innerHTML = "";
        }
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
