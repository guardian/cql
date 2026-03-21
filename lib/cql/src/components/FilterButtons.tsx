import React from "react";
import { Component } from "./Menu";

interface FilterButtonsProps {
  onInsertChip: (value: string) => void;
}

const chips = [
  { value: "tag", label: "Tag" },
  { value: "section", label: "Section" },
  { value: "production-office", label: "Production office" },
];

export const FilterButtons = ({ onInsertChip }: FilterButtonsProps) => (
  <div className="cql-field-suggestions-container">
    <div className="cql-field-suggestions-heading">Filter by:</div>
    <div className="cql-field-suggestions">

      {chips.map((chip) => (
        <Component />
        // <button
        //   key={chip.value}
        //   className="btn-apply-chip-suggestion"
        //   onClick={() => onInsertChip(chip.value)}
        // >
        //   {chip.label}
        // </button>
      ))}
    </div>
  </div>
);
