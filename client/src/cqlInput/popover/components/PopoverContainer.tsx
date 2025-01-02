import { h, FunctionComponent } from "preact";
import { DateSuggestionContent } from "./DateSuggestionContent";
import { TextSuggestionContent } from "./TextSuggestionContent";
import { useEffect, useState } from "preact/hooks";
import { TypeaheadSuggestion } from "../../../lang/types";

export type PopoverRendererState = {
  suggestion: TypeaheadSuggestion | undefined;
  currentOptionIndex: number;
  isPending: boolean;
};

type StateSubscriber = (sub: (state: PopoverRendererState) => void) => void;

export type Actions = "left" | "right" | "up" | "down" | "enter";
export type ActionHandler = (action: Actions) => true | undefined;
export type ActionSubscriber = (handler: ActionHandler) => void;

type PopoverProps = {
  subscribeToState: StateSubscriber;
  subscribeToAction: ActionSubscriber;
  onSelect: (value: string) => void;
};

export const PopoverContainer: FunctionComponent<PopoverProps> = ({
  subscribeToState,
  subscribeToAction,
  onSelect,
}) => {
  const [state, setState] = useState<PopoverRendererState | undefined>();
  useEffect(() => {
    subscribeToState((state) => {
      setState(state);
    });
  }, [subscribeToState]);

  if (!state?.suggestion) {
    return <div>No results</div>;
  }

  switch (state.suggestion.type) {
    case "TEXT":
      return (
        <TextSuggestionContent
          suggestion={state.suggestion}
          onSelect={onSelect}
          subscribeToAction={subscribeToAction}
        ></TextSuggestionContent>
      );
    case "DATE":
      return (
        <DateSuggestionContent
          suggestion={state.suggestion}
          onSelect={onSelect}
          subscribeToAction={subscribeToAction}
        ></DateSuggestionContent>
      );
  }
};
