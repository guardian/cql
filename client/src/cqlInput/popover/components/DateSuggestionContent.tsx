import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { DateSuggestion } from "../../../lang/types";
import { ActionSubscriber } from "./PopoverContainer";
import { wrapSelection } from "./utils";

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
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [currentOptionIndex, setCurrentOptionIndex] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToAction((action) => {
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
            suggestion.suggestions[currentOptionIndex - indexOffset].value
          );
          return true;
        }
        default: {
          break;
        }
      }
    });

    return unsubscribe;
  }, [subscribeToAction, currentOptionIndex, tabIndex, suggestion]);

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
        <div class="Cql__Option Cql__AbsoluteDateOption">
          <input
            class="Cql__Input"
            ref={dateInputRef}
            type="date"
            onKeyDown={(e) => {
              switch (e.key) {
                case "Enter": {
                  onSelect((e.target as HTMLInputElement).value);
                  return;
                }
                case "Escape": {
                  closePopover();
                  return;
                }
              }
            }}
          />
          <button
            class="Cql__Button"
            onClick={() =>
              dateInputRef.current && onSelect(dateInputRef.current?.value)
            }
          >
            Apply
          </button>
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
