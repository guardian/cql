import { placeholder } from "wordgard/editor";
import { GardState } from "wordgard/state";

export const CLASSNAME_PLACEHOLDER = "Cql__Placeholder";

const getDefaultPlaceholder = (text: string) => {
  const span = document.createElement("span");
  span.innerHTML = text;
  span.className = CLASSNAME_PLACEHOLDER;

  return span;
};

export const createPlaceholderPlugin = (text: string): GardState.Extension =>
  placeholder(() => getDefaultPlaceholder(text));
