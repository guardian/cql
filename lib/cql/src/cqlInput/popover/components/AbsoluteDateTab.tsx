import React, { RefObject, useState } from "react";

export const AbsoluteDateTab = ({
  dateInputRef,
  onSelect,
  closePopover,
}: {
  dateInputRef: RefObject<HTMLInputElement>;
  onSelect: (value: string) => void;
  closePopover: () => void;
}) => {
  const [absoluteDate, setAbsoluteDate] = useState("");
  return (
    <div className="Cql__Option Cql__AbsoluteDateOption">
      <input
        className="Cql__Input"
        ref={dateInputRef}
        type="date"
        value={absoluteDate}
        onInput={(e) => setAbsoluteDate((e.target as HTMLInputElement).value)}
        onKeyDown={(e) => {
          switch (e.key) {
            case "Enter": {
              onSelect(absoluteDate);
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
        className="Cql__Button"
        onClick={() =>
          dateInputRef.current && onSelect(dateInputRef.current?.value)
        }
      >
        Apply
      </button>
    </div>
  );
};
