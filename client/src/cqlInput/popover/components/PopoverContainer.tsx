import { h, FunctionComponent } from "preact";
import { DateSuggestionContent } from "./DateSuggestionContent";
import { TextSuggestionContent } from "./TextSuggestionContent";
import { useEffect, useState } from "preact/hooks";
import { TypeaheadSuggestion } from "../../../lang/types";
import { CLASS_PENDING } from "../TypeaheadPopover";

export type PopoverRendererState = {
  suggestion: TypeaheadSuggestion | undefined;
  currentOptionIndex: number;
  isPending: boolean;
  isVisible: boolean;
};

type Unsubscriber = () => void;
type StateSubscriber = (
  sub: (state: PopoverRendererState) => void
) => Unsubscriber;

export type Actions = "left" | "right" | "up" | "down" | "enter";
export type ActionHandler = (action: Actions) => true | undefined;
export type ActionSubscriber = (handler: ActionHandler) => Unsubscriber;

type PopoverProps = {
  subscribeToState: StateSubscriber;
  subscribeToAction: ActionSubscriber;
  onSelect: (value: string) => void;
  closePopover: () => void;
};

export const PopoverContainer: FunctionComponent<PopoverProps> = ({
  subscribeToState,
  subscribeToAction,
  onSelect,
  closePopover,
}) => {
  const [state, setState] = useState<PopoverRendererState | undefined>();

  useEffect(() => {
    subscribeToState((state) => {
      setState(state);
    });
  }, [subscribeToState]);

  if (!state?.isVisible) {
    return;
  }

  if (state.isPending && !state.suggestion) {
    return (
      <div class={`Cql__Option ${CLASS_PENDING}`}>
        <div class="Cql__OptionLabel">Loading</div>
      </div>
    );
  }

  if (!state.suggestion) {
    return <div>No results</div>;
  }

  switch (state.suggestion.type) {
    case "TEXT":
      return (
        <TextSuggestionContent
          suggestion={state.suggestion}
          isPending={state.isPending}
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
          closePopover={closePopover}
        ></DateSuggestionContent>
      );
  }
};
