import { CqlService } from "../CqlService";
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
    chip {
      display: block;
    }
    chip-wrapper: { display: flex-inline; }
    chip {
      display: inline-flex;
      background-color: rgba(255,255,255,0.2);
      padding: 0 5px;
      margin: 0 5px;
      border-radius: ${baseBorderRadius};
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
      font-size: ${baseFontSize};
      position-anchor: --cql-input;
      top: anchor(end);
      margin: 0;
      width: 150px;
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

      createEditor(cqlInput, cqlPopover, cqlService, debugEl);
    }
  }

  return CqlInput;
};
