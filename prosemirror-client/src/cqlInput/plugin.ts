import { DecorationSet } from "prosemirror-view";
import { CqlService } from "../CqlService";
import { AllSelection, Plugin, PluginKey } from "prosemirror-state";
import {
  getNewSelection,
  isBeginningKeyValPair,
  logNode,
  mapTokens,
  queryStrFromDoc,
  tokensToDecorationSet,
  tokensToNodes,
} from "./utils";

const cqlPluginKey = new PluginKey<PluginState>("cql-plugin");

type PluginState = {
  queryStr?: string;
  decorations: DecorationSet;
};

const NEW_TOKENS = "NEW_TOKENS";

export const createCqlPlugin = (cqlService: CqlService) =>
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
      const updateView = async (
        query: string,
        shouldWrapSelectionInKey: boolean = false
      ) => {
        const { tokens, suggestions } = await cqlService.fetchResult(query);
        const newDoc = tokensToNodes(tokens);
        console.log(JSON.stringify(tokens, undefined, ' '));
        logNode(newDoc);
        const userSelection = view.state.selection;
        const docSelection = new AllSelection(view.state.doc);
        const tr = view.state.tr;

        tr.replaceWith(docSelection.from, docSelection.to, newDoc)
          .setSelection(
            getNewSelection(userSelection, shouldWrapSelectionInKey, tr.doc)
          )
          .setMeta(NEW_TOKENS, tokens);

        if (suggestions.length && tr.selection.from === tr.selection.to) {
          console.log("single position: testing selections");
          const mapping = mapTokens(tokens);
          suggestions.map((suggestion) => {
            const start = mapping.map(suggestion.from);
            const end = mapping.map(suggestion.to);
            if (tr.selection.from >= start && tr.selection.to <= end) {
              console.log("suggestion to apply:", suggestion);
            }
          });
        }

        view.dispatch(tr);
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
