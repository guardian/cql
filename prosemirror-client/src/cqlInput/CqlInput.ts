import { CqlService } from "../CqlService";
import { createEditor } from "./editor";

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
      border-left: 1px solid rgba(255,255,255,0.2);
      border-right: 1px solid rgba(255,255,255,0.2);
      padding: 0 5px;
      margin: 0 5px;
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
  </style>
`;

export const createCqlInput = (cqlService: CqlService) => {
  class CqlInput extends HTMLElement {
    connectedCallback() {
      const cqlInputId = "cql-input";
      const cqlPopoverId = "cql-popover";
      const shadow = this.attachShadow({ mode: "closed" });

      shadow.innerHTML = `<div id="${cqlInputId}"></div><div id="${cqlPopoverId}"></div>`;
      shadow.appendChild(template.content.cloneNode(true));
      const cqlInput = shadow.getElementById(cqlInputId)!;
      const cqlPopover = shadow.getElementById(cqlPopoverId)!;

      createEditor(cqlInput, cqlPopover, cqlService);
    }
  }

  return CqlInput;
};
