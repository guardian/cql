import type { EditorState } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";

export const CLASSNAME_PLACEHOLDER = "Cql__Placeholder";

const getDefaultPlaceholder = (text: string) => {
  const span = document.createElement("span");
  span.innerHTML = text;
  span.className = CLASSNAME_PLACEHOLDER;

  return span;
};

type PlaceholderState = {
  text: string;
  shouldDisplayPlaceholder: boolean;
};

const placeholderPluginKey = new PluginKey<PlaceholderState>(
  "cql_placeholder_plugin",
);

const CQL_UPDATE_PLACEHOLDER = "CQL_UPDATE_PLACEHOLDER";

export const createPlaceholderPlugin = (text: string) => {
  const shouldDisplayPlaceholder = (state: EditorState) =>
    text !== undefined && state.doc.childCount <= 1 && !state.doc.textContent;
  return new Plugin<PlaceholderState>({
    key: placeholderPluginKey,
    state: {
      init(_, state) {
        return {
          text,
          shouldDisplayPlaceholder: shouldDisplayPlaceholder(state),
        };
      },
      apply(tr, { text }, _, newState) {
        const maybeNewText: string | undefined = tr.getMeta(
          CQL_UPDATE_PLACEHOLDER,
        );

        const newText = maybeNewText !== undefined ? maybeNewText : text;

        return {
          text: newText,
          shouldDisplayPlaceholder: shouldDisplayPlaceholder(newState),
        };
      },
    },

    view: (view) => {
      const initialPluginState = placeholderPluginKey.getState(view.state);

      const placeholderEl = getDefaultPlaceholder(
        initialPluginState?.text ?? "",
      );

      const applyPlaceholder = (prevState?: EditorState) => {
        const prevPluginState = prevState
          ? placeholderPluginKey.getState(prevState)
          : undefined;
        const pluginState = placeholderPluginKey.getState(view.state);

        if (
          !prevPluginState ||
          prevPluginState?.shouldDisplayPlaceholder !==
            pluginState?.shouldDisplayPlaceholder
        )
          if (pluginState?.shouldDisplayPlaceholder) {
            view.dom.parentElement?.appendChild(placeholderEl);
          } else if (view.dom.parentElement?.contains(placeholderEl)) {
            view.dom.parentElement?.removeChild(placeholderEl);
          }
      };

      applyPlaceholder();

      return {
        update(_, prevState) {
          applyPlaceholder(prevState);
        },
      };
    },
  });
};
