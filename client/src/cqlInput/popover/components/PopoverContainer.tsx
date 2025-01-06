import { h, FunctionComponent } from "preact";
import { DateSuggestionContent } from "./DateSuggestionContent";
import { TextSuggestionContent } from "./TextSuggestionContent";
import { useEffect, useState } from "preact/hooks";
import { TypeaheadSuggestion } from "../../../lang/types";
import { CLASS_PENDING } from "../TypeaheadPopover";
import { Debounce } from "./Debounce";

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
  // Subscribe to state updates when suggestion state changes
  subscribeToState: StateSubscriber;
  // Subscribe to action updates from the input - for example, when users press
  // arrow keys or "Enter"
  subscribeToAction: ActionSubscriber;
  // Apply a suggestion to the input
  applySuggestion: (value: string) => void;
  // Skip the current suggestion, moving on to the next available field
  skipSuggestion: () => void;
  // Close the popover
  closePopover: () => void;
};

// The delay before showing a loading placeholder, to avoid quick
// flashes of loading for timely fetches.
const loadingDelayMs = 500;

export const PopoverContainer: FunctionComponent<PopoverProps> = ({
  subscribeToState,
  subscribeToAction,
  applySuggestion,
  skipSuggestion,
  closePopover,
}) => {
  const [loadingTimer, setLoadingTimer] = useState<Timer>();
  const [displayLoading, setDisplayLoading] = useState(false);
  const [state, setState] = useState<PopoverRendererState | undefined>();

  useEffect(() => {
    subscribeToState((state) => {
      setState(state);
    });
  }, [subscribeToState]);

  useEffect(() => {
    if (!loadingTimer && state?.isPending && !state.suggestion) {
      setLoadingTimer(
        setTimeout(() => {
          setDisplayLoading(true);
        }, loadingDelayMs)
      );
    }

    if (!state?.isPending && loadingTimer) {
      clearTimeout(loadingTimer);
      setDisplayLoading(false);
    }
  }, [state]);

  if (
    // Nothing to render
    !state?.isVisible ||
    // We have no suggestions to render, we are waiting for suggestions to
    // arrive, and we are not yet ready to display a loading placeholder
    (!state.suggestion && state.isPending && !displayLoading)
  ) {
    return;
  }

  const getPopoverContent = () => {
    if (displayLoading) {
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
          <Debounce
            throttleInMs={100}
            component={TextSuggestionContent}
            suggestion={state.suggestion}
            isPending={state.isPending}
            onSelect={applySuggestion}
            onSkip={skipSuggestion}
            subscribeToAction={subscribeToAction}
          />
        );
      case "DATE":
        return (
          <DateSuggestionContent
            suggestion={state.suggestion}
            onSelect={applySuggestion}
            onSkip={skipSuggestion}
            closePopover={closePopover}
            subscribeToAction={subscribeToAction}
          ></DateSuggestionContent>
        );
    }
  };

  return <div class="Cql__TypeaheadPopover">{getPopoverContent()}</div>;
};
