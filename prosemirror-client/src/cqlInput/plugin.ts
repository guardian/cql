import { DecorationSet } from "prosemirror-view";
import { CqlService, TypeaheadSuggestion } from "../CqlService";
import { AllSelection, Plugin, PluginKey } from "prosemirror-state";
import {
  getNewSelection,
  isBeginningKeyValPair,
  createTokenMap,
  queryStrFromDoc,
  tokensToDecorations,
  tokensToNodes,
  toProseMirrorTokens,
  ProseMirrorToken,
} from "./utils";
import { Mapping } from "prosemirror-transform";
import { TypeaheadPopover } from "./TypeaheadPopover";
import { doc, schema } from "./schema";
import { Slice } from "prosemirror-model";

const cqlPluginKey = new PluginKey<PluginState>("cql-plugin");

type PluginState = {
  queryStr?: string;
  mapping: Mapping;
} & ServiceState;

type ServiceState = {
  tokens: ProseMirrorToken[];
  suggestions: TypeaheadSuggestion[];
};

const NEW_STATE = "NEW_STATE";

export const createCqlPlugin = (
  cqlService: CqlService,
  popoverEl: HTMLElement,
  debugEl?: HTMLElement
) => {
  let typeaheadPopover: TypeaheadPopover | undefined;
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
      init(config) {
        const queryStr = config.doc ? queryStrFromDoc(config.doc) : undefined;
        return {
          queryStr,
          tokens: [],
          suggestions: [],
          mapping: new Mapping(),
        };
      },
      apply(tr, { tokens, suggestions, mapping }, _, newState) {
        const maybeNewState: ServiceState | undefined = tr.getMeta(NEW_STATE);

        return {
          queryStr: queryStrFromDoc(newState.doc),
          mapping: maybeNewState?.tokens
            ? createTokenMap(maybeNewState?.tokens)
            : mapping,
          tokens: maybeNewState?.tokens ?? tokens,
          suggestions: maybeNewState?.suggestions ?? suggestions,
        };
      },
    },
    props: {
      decorations: (state) => {
        const { tokens } = cqlPluginKey.getState(state)!;

        return DecorationSet.create(state.doc, tokensToDecorations(tokens));
      },
      handleKeyDown(_, event) {
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
        }
      },
      // Serialise outgoing content to a CQL string for portability
      clipboardTextSerializer(content) {
        const node = doc.create(undefined, content.content);
        const queryStr = queryStrFromDoc(node);
        return queryStr;
      },
    },
    view(view) {
      typeaheadPopover = new TypeaheadPopover(view, popoverEl, debugEl);

      const updateView = async (
        query: string,
        shouldWrapSelectionInKey: boolean = false
      ) => {
        const {
          tokens: _tokens,
          suggestions,
          ast,
        } = await cqlService.fetchResult(query);
        const tokens = toProseMirrorTokens(_tokens);
        const newDoc = tokensToNodes(tokens);

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

        tr.replaceWith(docSelection.from, docSelection.to, newDoc)
          .setSelection(
            getNewSelection(userSelection, shouldWrapSelectionInKey, tr.doc)
          )
          .setMeta(NEW_STATE, { tokens, suggestions });

        view.dispatch(tr);
      };

      updateView(cqlPluginKey.getState(view.state)?.queryStr!);

      return {
        update(view, prevState) {
          const prevQuery = cqlPluginKey.getState(prevState)?.queryStr!;
          const {
            queryStr: currentQuery,
            suggestions,
            mapping,
          } = cqlPluginKey.getState(view.state)!;

          typeaheadPopover?.updateItemsFromSuggestions(suggestions, mapping);

          if (!currentQuery) {
            return;
          }

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
};
