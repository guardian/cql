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
          console.log("single position: testing selections", suggestions);
          const mapping = createTokenMap(tokens);

          suggestions.forEach((suggestion) => {
            const start = mapping.map(suggestion.from);
            const end = mapping.map(suggestion.to);
            if (
              view.state.selection.from >= start &&
              view.state.selection.to <= end
            ) {
              console.log("suggestion to apply:", suggestion);
              const chipPos = findNodeAt(start, view.state.doc, chip);
              const domSelectionAnchor = view.nodeDOM(
                chipPos
              ) as HTMLElement;
              const { left } = domSelectionAnchor.getBoundingClientRect();
              popoverEl.style.left = `${left}px`;
            }
          });

          popoverEl.innerHTML = `<div>${suggestions
            .flatMap((suggestion) => {
              if (!suggestion.suggestions.TextSuggestion) {
                return;
              }
              return suggestion.suggestions.TextSuggestion.suggestions.map(
                ({ label, value }) => {
                  return `<div>${label}</div>`;
                }
              );
            })
            .join("")}</div>`;

          popoverEl.showPopover();
        } else {
          popoverEl.hidePopover();
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
