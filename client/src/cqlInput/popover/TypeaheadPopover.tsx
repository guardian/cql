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
  };

  public hide = () => {
    super.hide();
    this.view.focus();
  };

  protected updateRenderer = () => {
    this.updateRendererState?.({
      suggestion: this.currentSuggestion,
      currentOptionIndex: this.currentOptionIndex,
      isPending: this.isPending,
      isVisible: this.isVisible,
    });
  };

  private applyValueToInput = (value: string, hide = true) => {
    if (!this.currentSuggestion) {
      return;
    }

    const { from, to } = this.currentSuggestion;

    if (hide) {
      this.hide();
    }

    this.applySuggestion(from, to, value);
  };
}
