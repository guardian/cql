import { h, FunctionComponent } from "preact";
import { DateSuggestionContent } from "./DateSuggestionContent";
import { TextSuggestionContent } from "./TextSuggestionContent";
import { useEffect, useState } from "preact/hooks";
import {
  CLASS_PENDING,
  PopoverRendererArgs,
  PopoverRendererState,
} from "../TypeaheadPopover";
import { Debounce } from "./Debounce";

// The delay before showing a loading placeholder, to avoid quick
// flashes of loading for timely fetches.
const loadingDelayMs = 500;

export const PopoverContainer: FunctionComponent<
  Omit<PopoverRendererArgs, "popoverEl">
> = ({
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
        }, loadingDelayMs),
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
