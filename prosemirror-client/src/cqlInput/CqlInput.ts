import { CqlService } from "../CqlService";
import { QueryChangeEventDetail } from "./dom";
import { createEditor } from "./editor";

const baseFontSize = "28px";
const baseBorderRadius = "5px";
const template = document.createElement("template");
template.innerHTML = `
  <style>
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
      border-radius: ${baseBorderRadius};
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
      font-size: ${baseFontSize};
      anchor-name: --cql-input;
      border: 2px solid grey;
      border-radius: ${baseBorderRadius};
    }

    #cql-popover {
      width: 250px;
      margin: 0;
      padding: 0;
      top: anchor(end);
      font-size: ${baseFontSize};
      position-anchor: --cql-input;
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

    .Cql__ChipWrapper--is-pending-delete chip {
      background-color: darkred;
    }

    .Cql__ChipWrapperDeleteHandle, .Cql__ChipWrapperPolarityHandle {
      background-color: rgba(0,0,0,0.2);
      padding: 0 5px;
      cursor: pointer;
    }
  </style>
`;

export const createCqlInput = (
  cqlService: CqlService,
  debugEl?: HTMLElement
) => {
  class CqlInput extends HTMLElement {
    connectedCallback() {
      const cqlInputId = "cql-input";
      const cqlPopoverId = "cql-popover";
      const shadow = this.attachShadow({ mode: "closed" });

      shadow.innerHTML = `<div id="${cqlInputId}"></div><div id="${cqlPopoverId}" popover anchor="${cqlInputId}"></div>`;
      shadow.appendChild(template.content.cloneNode(true));
      const cqlInput = shadow.getElementById(cqlInputId)!;
      const cqlPopover = shadow.getElementById(cqlPopoverId)!;

      const onChange = (detail: QueryChangeEventDetail) => {
        this.dispatchEvent(
          new CustomEvent("queryChange", {
            detail,
          })
        );
      };

      createEditor({
        mountEl: cqlInput,
        popoverEl: cqlPopover,
        cqlService,
        debugEl,
        onChange,
      });
    }
  }

  return CqlInput;
};
