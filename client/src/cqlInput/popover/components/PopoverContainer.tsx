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

type PopoverProps = {
  subscribe: (sub: (state: PopoverRendererState) => void) => void;
  onSelect: (value: string) => void;
};

export const PopoverContainer: FunctionComponent<PopoverProps> = ({
  subscribe,
  onSelect,
}) => {
  const [state, setState] = useState<PopoverRendererState | undefined>();
  useEffect(() => {
    subscribe((state) => {
      setState(state);
    });
  }, [subscribe]);

  if (!state?.suggestion) {
    return <div>No results</div>;
  }

  switch (state.suggestion.type) {
    case "TEXT":
      return (
        <TextSuggestionContent
          suggestion={state.suggestion}
          onSelect={onSelect}
          currentOptionIndex={state.currentOptionIndex}
        ></TextSuggestionContent>
      );
    case "DATE":
      return (
        <DateSuggestionContent
          suggestion={state.suggestion}
          onSelect={onSelect}
          currentOptionIndex={state.currentOptionIndex}
        ></DateSuggestionContent>
      );
  }
};