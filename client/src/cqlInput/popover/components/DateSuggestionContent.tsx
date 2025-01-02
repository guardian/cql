import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { DateSuggestion } from "../../../lang/types";
import { ActionSubscriber } from "./PopoverContainer";
import { wrapSelection } from "./utils";

export const DateSuggestionContent = ({
  suggestion,
  onSelect,
  subscribeToAction,
}: {
  suggestion: DateSuggestion;
  onSelect: (value: string) => void;
  subscribeToAction: ActionSubscriber;
}) => {
  const currentItemRef = useRef<HTMLDivElement | null>(null);
  const indexOffset = 1; // The first index is to support an unselected state
  const [tabIndex, setTabIndex] = useState(0);

  const [currentOptionIndex, setCurrentOptionIndex] = useState(0);

  useEffect(() => {
    subscribeToAction((action) => {
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
          onSelect(
            suggestion.suggestions[currentOptionIndex + indexOffset].value
          );
          return true;
        }
        default: {
          break;
        }
      }
    });
  }, [subscribeToAction, currentOptionIndex, tabIndex, suggestion]);

  useEffect(() => {
    if (currentOptionIndex !== undefined) {
      currentItemRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [currentOptionIndex]);

  const tabs = [
    {
      label: "Relative",
      content: suggestion.suggestions.map(({ label, value }, index) => {
        const isSelected = index + indexOffset === currentOptionIndex;
        const selectedClass = isSelected ? "Cql__Option--is-selected" : "";

        return (
          <div
            class={`Cql__Option ${selectedClass}`}
            ref={isSelected ? currentItemRef : null}
            onClick={() => onSelect(value)}
          >
            <div class="Cql__OptionLabel">{label}</div>
          </div>
        );
      }),
    },
    {
      label: "Absolute",
      content: (
        <div class="Cql__Option">
          <input
            class="Cql__Input"
            autoFocus
            type="date"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSelect((e.target as HTMLInputElement).value);
              }
            }}
          />
        </div>
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
      <div class="Cql__PopoverTabContent">{tabs[tabIndex].content}</div>
    </div>
  );
};
