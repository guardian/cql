import type { Node } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const getDefaultPlaceholder = (text: string) => {
  const span = document.createElement("span");
  span.style.display = "inline-block";
  span.style.width = "100%";
  span.style.whiteSpace = "nowrap";
  span.style.overflowX = "hidden";
  span.style.textOverflow = "ellipsis";
  span.style.verticalAlign = "bottom";
  // Passes accessibility contrast on a white background
  span.style.color = "#777575";
  span.style.pointerEvents = "none";
  span.style.cursor = "text";
  span.draggable = false;
  span.innerHTML = text;

  return span;
};

/**
 * Get the first placeholder position in the document – assumed
 * to be the starting position of the deepest first child.
 */
const getFirstPlaceholderPosition = (node: Node, currentPos = 0): number =>
  node.firstChild
    ? getFirstPlaceholderPosition(node.firstChild, currentPos + 1)
    : currentPos;

type PlaceholderOption = string | (() => HTMLElement);

const placeholderPluginKey = new PluginKey<PlaceholderOption>(
  "cql_placeholder_plugin",
);

const CQL_UPDATE_PLACEHOLDER = "CQL_UPDATE_PLACEHOLDER";

export const createPlaceholderPlugin = (text: PlaceholderOption) =>
  new Plugin<PlaceholderOption>({
    key: placeholderPluginKey,
    state: {
      init() {
        return text;
      },
      apply(tr, oldPlaceholder) {
        const newPlaceholder: PlaceholderOption | undefined = tr.getMeta(
          CQL_UPDATE_PLACEHOLDER,
        );

        return newPlaceholder !== undefined ? newPlaceholder : oldPlaceholder;
      },
    },
    props: {
      decorations: (state: EditorState) => {
        const placeholder = placeholderPluginKey.getState(state);
        if (
          placeholder === undefined ||
          state.doc.childCount > 1 ||
          !!state.doc.textContent
        ) {
          return DecorationSet.empty;
        }

        const getPlaceholder =
          typeof placeholder === "string"
            ? getDefaultPlaceholder(placeholder)
            : placeholder;

        // If the document contains inline content only, just place the widget at its start.
        const pos = state.doc.inlineContent
          ? 0
          : getFirstPlaceholderPosition(state.doc);
        return DecorationSet.create(state.doc, [
          Decoration.widget(pos, getPlaceholder),
        ]);
      },
    },
  });
