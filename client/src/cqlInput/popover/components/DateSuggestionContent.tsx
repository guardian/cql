import { h } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { DateSuggestion } from "../../../lang/types";
import { ActionHandler, ActionSubscriber } from "./PopoverContainer";
import { wrapSelection } from "./utils";
import { RelativeDateTab } from "./RelativeDateTab";
import { AbsoluteDateTab } from "./AbsoluteDateTab";

export const DateSuggestionContent = ({
  suggestion,
  onSelect,
  closePopover,
  subscribeToAction,
}: {
  suggestion: DateSuggestion;
  onSelect: (value: string) => void;
  closePopover: () => void;
  subscribeToAction: ActionSubscriber;
}) => {
  const currentItemRef = useRef<HTMLDivElement>(null);
  const indexOffset = 1; // The first index is to support an unselected state
  const [tabIndex, setTabIndex] = useState(0);
  const [currentOptionIndex, setCurrentOptionIndex] = useState(0);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleAction: ActionHandler = useCallback(
    (action) => {
      switch (action) {
        case "up":
          setCurrentOptionIndex(
            wrapSelection(
              currentOptionIndex,
              -1,
              suggestion.suggestions.length + indexOffset
            )
          );
          return true;
        case "down": {
          setCurrentOptionIndex(
            wrapSelection(
              currentOptionIndex,
              1,
              suggestion.suggestions.length + indexOffset
            )
          );
          return true;
        }
        case "left": {
          if (currentOptionIndex < indexOffset) {
            return;
          }
          setTabIndex(wrapSelection(tabIndex, -1, tabs.length));
          return true;
        }
        case "right": {
          if (currentOptionIndex < indexOffset) {
            return;
          }
          setTabIndex(wrapSelection(tabIndex, 1, tabs.length));
          return true;
        }
        case "enter": {
          if (currentOptionIndex === 0) {
            return;
          }
          onSelect(
            suggestion.suggestions[currentOptionIndex - indexOffset].value
          );
          return true;
        }
        default: {
          break;
        }
      }
    },
    [currentOptionIndex, tabIndex, suggestion]
  );

  useEffect(
    () => subscribeToAction(handleAction),
    [subscribeToAction, handleAction]
  );

  useEffect(() => {
    if (currentOptionIndex !== undefined) {
      currentItemRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [currentOptionIndex]);

  useEffect(() => {
    if (tabIndex === tabs.findIndex((tab) => tab.label === "Absolute")) {
      dateInputRef.current?.focus();
    }
  }, [tabIndex, dateInputRef]);

  const tabs = [
    {
      label: "Relative",
      content: () => (
        <RelativeDateTab
          suggestion={suggestion}
          indexOffset={indexOffset}
          currentOptionIndex={currentOptionIndex}
          currentItemRef={currentItemRef}
          onSelect={onSelect}
        />
      ),
    },
    {
      label: "Absolute",
      content: () => (
        <AbsoluteDateTab
          onSelect={onSelect}
          closePopover={closePopover}
          dateInputRef={dateInputRef}
        />
      ),
    },
  ];

  return (
    <div class="Cql__PopoverTab">
      <div class="Cql__PopoverTabList">
        {tabs.map(({ label }, index) => (
          <div
            class={`Cql__PopoverTabItem ${index === tabIndex && "Cql__PopoverTabItem--active"}`}
            onClick={() => setTabIndex(index)}
          >
            {label}
          </div>
        ))}
      </div>
      <div class="Cql__PopoverTabContent">{tabs[tabIndex].content()}</div>
    </div>
  );
};
