import { h, render } from "preact";
import { PopoverContainer } from "./PopoverContainer";
import { PopoverRendererArgs } from "../TypeaheadPopover";

export const defaultPopoverRenderer = ({
  popoverEl,
  ...props
}: PopoverRendererArgs) => {
  render(<PopoverContainer {...props} />, popoverEl);
};
