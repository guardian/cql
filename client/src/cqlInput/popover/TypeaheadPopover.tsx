import { Popover } from "./Popover";
import {
  MappedTypeaheadSuggestion,
  TypeaheadSuggestion,
} from "../../lang/types";
import { EditorView } from "prosemirror-view";
import { h, render } from "preact";
import {
  ActionHandler,
  PopoverContainer,
  PopoverRendererState,
} from "./components/PopoverContainer";

export const CLASS_PENDING = "Cql__Typeahead--pending";

const noopActionHandler = () => {
  console.warn(
    "[TypeaheadPopover]: No action handler has been registered by the popover renderer"
  );
  return undefined;
};

const noopUpdateRendererState = () => {
  console.warn(
    "[TypeaheadPopover]: No update state callback has been registered by the popover renderer"
  );
  return undefined;
};

export class TypeaheadPopover extends Popover {
  public handleAction: ActionHandler = noopActionHandler;
  private updateRendererState: (state: PopoverRendererState) => void =
    noopUpdateRendererState;

  private currentSuggestion: TypeaheadSuggestion | undefined;
  private currentOptionIndex = 0;
  private isPending = false;

  public constructor(
    public view: EditorView,
    public popoverEl: HTMLElement,
    public applySuggestion: (from: number, to: number, value: string) => void
  ) {
    super(popoverEl);

    render(
      <PopoverContainer
        subscribeToState={(updateRendererState) => {
          this.updateRendererState = updateRendererState;

          // Ensure the initial state of the renderer is in sync with this class's state.
          this.updateRenderer();

          return () => {
            this.updateRendererState = noopUpdateRendererState;
          };
        }}
        subscribeToAction={(handleAction) => {
          this.handleAction = handleAction;

          return () => (this.handleAction = noopActionHandler);
        }}
        onSelect={this.applyValueToInput}
        closePopover={this.hide}
      />,
      popoverEl
    );

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

  public isRenderingNavigableMenu = () => !!this.currentSuggestion?.suggestions;

  public updateItemsFromSuggestions = (
    typeaheadSuggestions: MappedTypeaheadSuggestion[]
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
        currentSelection.from >= from && currentSelection.to <= to
    );

    if (!suggestionThatCoversSelection) {
      this.currentSuggestion = undefined;
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

  private applyValueToInput = (value: string) => {
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

    this.applySuggestion(from, to, value);
  };
}
