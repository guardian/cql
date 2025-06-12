import { Popover } from "./Popover";
import {
  MappedTypeaheadSuggestion,
  TypeaheadSuggestion,
} from "../../lang/types";
import { EditorView } from "prosemirror-view";

export const CLASS_PENDING = "Cql__Typeahead--pending";
export const CLASS_NO_RESULTS = "Cql__Typeahead--no-results";

export type PopoverRendererState = {
  suggestion: TypeaheadSuggestion | undefined;
  currentOptionIndex: number;
  isPending: boolean;
  isVisible: boolean;
};

type Unsubscriber = () => void;
type StateSubscriber = (
  sub: (state: PopoverRendererState) => void,
) => Unsubscriber;

export type Actions = "left" | "right" | "up" | "down" | "enter";
export type ActionHandler = (action: Actions) => true | undefined;
export type ActionSubscriber = (handler: ActionHandler) => Unsubscriber;
export type PopoverRendererArgs = {
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
  // The popover element. It's positioned adjacent to the relevant field when
  // it's visible.
  popoverEl: HTMLElement;
};
export type RenderPopoverContent = (props: PopoverRendererArgs) => void;

const noopActionHandler = () => {
  console.warn(
    "[TypeaheadPopover]: No action handler has been registered by the popover renderer",
  );
  return undefined;
};

const noopUpdateRendererState = () => {
  console.warn(
    "[TypeaheadPopover]: No update state callback has been registered by the popover renderer",
  );
  return undefined;
};

export class TypeaheadPopover extends Popover {
  public handleAction: ActionHandler = noopActionHandler;
  private updateRendererState: (state: PopoverRendererState) => void =
    noopUpdateRendererState;

  private _applySuggestion: (from: number, to: number, value: string) => void;
  private _skipSuggestion: () => void;
  private currentSuggestion: TypeaheadSuggestion | undefined;
  private currentOptionIndex = 0;
  private isPending = false;

  public constructor(
    private view: EditorView,
    protected popoverEl: HTMLElement,
    // Apply a suggestion to the input, replacing the given range
    applySuggestion: (from: number, to: number, value: string) => void,
    // Skip a suggestion, and move on to the next valid field
    skipSuggestion: () => void,
    // A callback that receives everything necessary to render popover content
    // as the input state changes.
    renderPopoverContent: (args: PopoverRendererArgs) => void,
  ) {
    super(popoverEl);
    this._applySuggestion = applySuggestion;
    this._skipSuggestion = skipSuggestion;

    renderPopoverContent({
      applySuggestion: this.applySuggestion,
      skipSuggestion: this.skipSuggestion,
      subscribeToAction: this.actionSubscriber,
      subscribeToState: this.stateSubscriber,
      closePopover: this.hide,
      popoverEl,
    });

    // Prevent the popover from stealing focus from the input, unless we are
    // focusing on another input within the popover
    popoverEl.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault();
      }
    });

    // Close the popover when the input loses focus, unless we are focusing
    // on an element within the popover
    view.dom.addEventListener("blur", (e) => {
      if (!popoverEl.contains(e.relatedTarget as HTMLElement)) {
        this.hide();
      }
    });
  }

  public isRenderingNavigableMenu = () => this.isVisible;

  public updateItemsFromSuggestions = (
    typeaheadSuggestions: MappedTypeaheadSuggestion[],
  ) => {
    this.isPending = false;
    if (
      this.view.isDestroyed ||
      !typeaheadSuggestions.length ||
      this.view.state.selection.from !== this.view.state.selection.to
    ) {
      this.currentSuggestion = undefined;
      this.currentOptionIndex = 0;
      this.hide();
      return;
    }

    const { selection: currentSelection } = this.view.state;
    const suggestionThatCoversSelection = typeaheadSuggestions.find(
      ({ from, to }) =>
        currentSelection.from >= from && currentSelection.to <= to,
    );

    if (!suggestionThatCoversSelection) {
      this.currentSuggestion = undefined;
      this.hide();
      this.updateRenderer();
      return;
    }

    this.currentSuggestion = suggestionThatCoversSelection;

    const { node } = this.view.domAtPos(this.currentSuggestion.from);
    this.show(node as HTMLElement);
  };

  public setIsPending = () => {
    this.isPending = true;
    this.updateRenderer();
  };

  public hide = () => {
    const isAlreadyHidden = !this.isVisible;
    super.hide();
    if (!isAlreadyHidden) {
      this.view.focus();
    }
  };

  protected updateRenderer = () => {
    this.updateRendererState?.({
      suggestion: this.currentSuggestion,
      currentOptionIndex: this.currentOptionIndex,
      isPending: this.isPending,
      isVisible: this.isVisible,
    });
  };

  private stateSubscriber: StateSubscriber = (updateRendererState) => {
    this.updateRendererState = updateRendererState;

    // Ensure the initial state of the renderer is in sync with this class's state.
    this.updateRenderer();

    return () => {
      this.updateRendererState = noopUpdateRendererState;
    };
  };

  private actionSubscriber: ActionSubscriber = (handleAction) => {
    this.handleAction = handleAction;
    const unsubscribe = () => (this.handleAction = noopActionHandler)

    return unsubscribe;
  };

  private applySuggestion = (value: string) => {
    if (!this.currentSuggestion) {
      return;
    }

    const { from, to, position } = this.currentSuggestion;
    // We will get a new position and suggestions after applying the value, but
    // this state will not be updated until suggestions are returned, so we
    // clear this state pre-emptively to avoid showing stale suggestions.
    this.currentSuggestion = undefined;

    if (position === "chipValue") {
      this.hide();
    }

    this._applySuggestion(from, to, value);
  };

  private skipSuggestion = () => {
    this.hide();
    this._skipSuggestion();
  };
}
