import { DecorationSet } from "prosemirror-view";
import { CqlService, TypeaheadSuggestion } from "../CqlService";
import {
  AllSelection,
  Plugin,
  PluginKey,
  Transaction,
} from "prosemirror-state";
import {
  getNewSelection,
  isBeginningKeyValPair,
  createTokenMap,
  queryStrFromDoc,
  tokensToDecorations,
  tokensToNodes,
  toProseMirrorTokens,
  ProseMirrorToken,
  logNode,
  applyDeleteIntent,
} from "./utils";
import { Mapping } from "prosemirror-transform";
import { TypeaheadPopover } from "./TypeaheadPopover";
import {
  DELETE_CHIP_INTENT,
  chipWrapper,
  doc,
  schema,
  searchText,
} from "./schema";
import { DOMSerializer, Fragment } from "prosemirror-model";

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
          polarityHandle.contentEditable = false;
          polarityHandle.innerHTML = "+";

          const deleteHandle = document.createElement("span");
          deleteHandle.classList.add("Cql__ChipWrapperDeleteHandle");
          deleteHandle.contentEditable = false;
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
            }
          };
        },
      },
      decorations: (state) => {
        const { tokens } = cqlPluginKey.getState(state)!;

        return DecorationSet.create(state.doc, tokensToDecorations(tokens));
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
        const queryStr = queryStrFromDoc(node);
        return queryStr;
      },
      clipboardSerializer: {
        serializeFragment: (fragment: Fragment) => {
          const node = doc.create(undefined, fragment);
          const queryStr = queryStrFromDoc(node);
          const plainTextNode = DOMSerializer.fromSchema(schema).serializeNode(
            schema.text(queryStr)
          );
          return plainTextNode;
        },
      } as DOMSerializer, // Cast because docs specify only serializeFragment is needed
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

        console.log("Incoming query", { from: query, tokens, ast });
        logNode(newDoc);

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
            queryStr: currentQuery = "",
            suggestions,
            mapping,
          } = cqlPluginKey.getState(view.state)!;

          typeaheadPopover?.updateItemsFromSuggestions(suggestions, mapping);

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
