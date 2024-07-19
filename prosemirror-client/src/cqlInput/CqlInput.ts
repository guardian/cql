import { CqlServiceInterface } from "../services/CqlService";
import { QueryChangeEventDetail } from "./dom";
import { createEditor } from "./editor";

const baseFontSize = 28;
const baseBorderRadius = 5;
const popoverArrowSize = 10;
const template = document.createElement("template");
template.innerHTML = `
  <style>
    * {
      box-sizing: border-box;
    }

    .ProseMirror {
      white-space: pre-wrap;
    }

    search-text {
      /* Ensure there's always space for input */
      display: inline-block;
      min-width: 5px;
    }

    chip-wrapper {
      display: inline-flex;
      background-color: rgba(255,255,255,0.2);
      margin: 0 5px;
      border-radius: ${baseBorderRadius}px;
    }

    chip {
      display: inline-flex;
      padding: 0 5px;
    }

    chip-key {
      display: flex;
      padding-right: 5px;
    }

    chip-key:after {
      content: ':'
    }

    .CqlToken__STRING {
      color: lightblue;
    }

    .CqlToken__AND, .CqlToken__OR {
      color: magenta;
    }

    .CqlToken__RIGHT_BRACKET, .CqlToken__LEFT_BRACKET {
      color: lightpink;
    }

    #cql-input {
      position: relative;
      padding: 5px;
      font-size: ${baseFontSize}px;
      anchor-name: --cql-input;
      border: 2px solid grey;
      border-radius: ${baseBorderRadius}px;
    }

    .Cql__Option {
      padding: 5px;
    }

    .Cql__Option--is-selected {
      background-color: rgba(0,0,0,0.1);
    }

    .Cql__Option:hover {
      background-color: rgba(0,0,0,0.2);
      cursor: pointer;
    }

    .Cql__OptionDescription {
      font-size: ${baseFontSize * 0.8}px;
    }

    .Cql__ChipWrapper--is-pending-delete chip {
      background-color: darkred;
    }

    .Cql__ChipWrapperDeleteHandle, .Cql__ChipWrapperPolarityHandle {
      background-color: rgba(0,0,0,0.2);
      padding: 0 5px;
      cursor: pointer;
    }

    .Cql__TypeaheadDateInput {
      width: 100%;
      border-radius: ${baseBorderRadius}px;
      border: none;
    }

    .Cql__TypeaheadPopover, .Cql__ErrorPopover {
      width: 500px;
      margin: 0;
      padding: 0;
      top: anchor(end);
      font-size: ${baseFontSize}px;
      border-radius: ${baseBorderRadius}px;
      position-anchor: --cql-input;
      overflow: visible;
    }

    .Cql__ErrorPopover {
      width: max-content;
    }

    .Cql__PopoverArrow {
      position: absolute;
      width: 0; 
      height: 0;
      border-left: ${popoverArrowSize}px solid transparent;
      border-right: ${popoverArrowSize}px solid transparent;
      border-bottom: ${popoverArrowSize}px solid white;
      top: -${popoverArrowSize}px;
    }
  </style>
`;

export const contentEditableTestId = "cql-input-contenteditable";
export const typeaheadTestId = "cql-input-typeahead";
export const errorTestId = "cql-input-error";

export const createCqlInput = (
  cqlService: CqlServiceInterface,
  debugEl?: HTMLElement
) => {
  class CqlInput extends HTMLElement {
    static observedAttributes = ["initialValue"];

    connectedCallback() {
      const cqlInputId = "cql-input";
      const cqlTypeaheadId = "cql-typeahead";
      const cqlErrorId = "cql-error";
      const shadow = this.attachShadow({ mode: "open" });

      shadow.innerHTML = `
        <div id="${cqlInputId}"></div>
        <div id="${cqlTypeaheadId}" class="Cql__TypeaheadPopover" data-testid="${typeaheadTestId}" popover anchor="${cqlInputId}"></div>
        <div id="${cqlErrorId}" class="Cql__ErrorPopover" data-testid="${errorTestId}" popover></div>
      `;
      shadow.appendChild(template.content.cloneNode(true));
      const cqlInput = shadow.getElementById(cqlInputId)!;
      const typeaheadEl = shadow.getElementById(cqlTypeaheadId)!;
      const errorEl = shadow.getElementById(cqlErrorId)!;

      const onChange = (detail: QueryChangeEventDetail) => {
        this.dispatchEvent(
          new CustomEvent("queryChange", {
            detail,
          })
        );
      };

      const editorNode = createEditor({
        initialValue: this.getAttribute("initial-value") ?? "",
        mountEl: cqlInput,
        typeaheadEl,
        errorEl,
        cqlService,
        debugEl,
        onChange,
      });

      editorNode.setAttribute("data-testid", contentEditableTestId);
    }
  }

  return CqlInput;
};
