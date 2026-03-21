import React from "react";
import { render } from "react-dom";
import { PopoverContainer } from "./PopoverContainer";
import { PopoverRendererArgs } from "../TypeaheadPopover";

export const defaultPopoverRenderer = ({
  popoverEl,
  ...props
}: PopoverRendererArgs) => {
  render(<PopoverContainer {...props} />, popoverEl);
};
