import { EditorView } from "prosemirror-view";
import { CqlServiceInterface } from "../services/CqlService";
import { QueryChangeEventDetail } from "../types/dom";
import { createEditorView } from "./editor/editor";
import { createCqlPlugin, VISIBLE_CLASS } from "./editor/plugin";

const baseFontSize = 28;
const baseBorderRadius = 5;
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
      display: inline-flex;
      padding: 0 5px;
    }

    chip-value {
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
      display: block;
      position: relative;
      font-size: ${baseFontSize}px;
    }

    .Cql__ContentEditable {
      padding: 5px;
      outline: 2px solid grey;
      border-radius: ${baseBorderRadius}px;
    }

    .Cql__ContentEditable.ProseMirror-focused {
      outline: 2px solid lightblue;
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

    .Cql__ChipWrapperContent {
      display: inline-flex;
    }

    .Cql__ChipWrapper--is-pending-delete {
      box-shadow: 0 0 0 3px #c52b2b;
      overflow: hidden;
    }

    .Cql__ChipWrapperDeleteHandle, .Cql__ChipWrapperPolarityHandle {
      background-color: #3737378f;
      padding: 0 5px;
      cursor: pointer;
    }

    .Cql__TypeaheadDateInput {
      width: 100%;
      border-radius: ${baseBorderRadius}px;
      border: none;
    }

    .Cql__TypeaheadPopover, .Cql__ErrorPopover {
      position: absolute;
      width: 500px;
      max-height: min(80vh, 400px);
      margin: 0;
      padding: 0;
      font-size: ${baseFontSize}px;
      border-radius: ${baseBorderRadius}px;
      overflow-y: scroll;
    }

    .Cql__ErrorPopover {
      display: none;
      width: max-content;
      background: transparent;
      border: none;
      color: red;
    }

    .Cql__ErrorMessageContainer {
      display: none;
    }

    .${VISIBLE_CLASS} {
      display: block;
    }
  </style>
`;

export const contentEditableTestId = "cql-input-contenteditable";
export const typeaheadTestId = "cql-input-typeahead";
export const errorTestId = "cql-input-error";
export const errorMsgTestId = "cql-input-error-message";

export type CqlConfig = {
  syntaxHighlighting?: boolean;
  debugEl?: HTMLElement;
};

export const createCqlInput = (
  cqlService: CqlServiceInterface,
  config: CqlConfig = { syntaxHighlighting: true }
) => {
  class CqlInput extends HTMLElement {
    static observedAttributes = ["initialValue"];

    private editorView: EditorView | undefined;

    public value = "";

    connectedCallback() {
      const cqlInputId = "cql-input";
      const cqlTypeaheadId = "cql-typeahead";
      const cqlErrorId = "cql-error";
      const cqlErrorMsgId = "cql-error-msg";
      const shadow = this.attachShadow({ mode: "open" });

      shadow.innerHTML = `
        <div id="${cqlInputId}" spellcheck="false"></div>
        <div id="${cqlTypeaheadId}" class="Cql__TypeaheadPopover" data-testid="${typeaheadTestId}" popover></div>
        <div id="${cqlErrorId}" class="Cql__ErrorPopover" data-testid="${errorTestId}" popover>~</div>
        <div id="${cqlErrorMsgId}" class="Cql__ErrorMessageContainer" data-testid="${errorMsgTestId}"></div>
      `;
      shadow.appendChild(template.content.cloneNode(true));
      const cqlInput = shadow.getElementById(cqlInputId)!;
      const typeaheadEl = shadow.getElementById(cqlTypeaheadId)!;
      const errorEl = shadow.getElementById(cqlErrorId)!;
      const errorMsgEl = shadow.getElementById(cqlErrorMsgId)!;

      const onChange = (detail: QueryChangeEventDetail) => {
        this.value = detail.cqlQuery;
        this.dispatchEvent(
          new CustomEvent("queryChange", {
            detail,
          })
        );
      };

      const plugin = createCqlPlugin({
        cqlService,
        typeaheadEl,
        errorEl,
        errorMsgEl,
        onChange,
        config,
      });

      const editorView = createEditorView({
        initialValue: this.getAttribute("initial-value") ?? "",
        mountEl: cqlInput,
        plugins: [plugin],
      });

      editorView.dom.setAttribute("data-testid", contentEditableTestId);
      editorView.dom.classList.add("Cql__ContentEditable")
    }

    disconnectedCallback() {
      this.editorView?.destroy();
    }
  }

  return CqlInput;
};
