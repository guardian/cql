import { EditorView } from "prosemirror-view";
import { QueryChangeEventDetail } from "../types/dom";
import { createEditorView } from "./editor/editor";
import { createCqlPlugin, CLASS_VISIBLE } from "./editor/plugin";
import { CLASS_PENDING } from "./popover/TypeaheadPopover";
import { CqlSuggestionService } from "../services/CqlSuggestionService";

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
      padding: 0 5px;
    }

    chip-value {
      padding-right: 5px;
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

    .Cql__PopoverTabList {
      display: flex;
    }

    .Cql__PopoverTabItem {
      color: #bbb;
      cursor: pointer;
      flex-grow: 1;
      text-align: center;
      border-bottom: 2px solid #495e65;
    }

    .Cql__PopoverTabItem:hover,
    .Cql__PopoverTabItem--active {
      background-color: rgba(255,255,255,0.1);
      color: #eee;
      border-bottom: 2px solid lightblue;
    }

    .Cql__Input {
      height: 1.5em;
      font-size: 1em;
    }

    .Cql__Option {
      padding: 5px;
      transition: color 0.1s background 0.1s;
    }

    .Cql__OptionLabel {
      display: flex;
      justify-content: space-between;
    }

    .Cql__OptionValue {
      font-size: 0.7em;
    }

    .Cql__Option--is-selected {
      background-color: rgba(255,255,255,0.1);
    }

    .Cql__Option--is-disabled {
      color: #bbb;
      pointer-events: none;
      cursor: not-allowed;
    }

    .Cql__Option:hover {
      background-color: rgba(255,255,255,0.2);
      cursor: pointer;
    }

    .Cql__OptionDescription {
      font-size: ${baseFontSize * 0.8}px;
    }

    .Cql__ChipKey--readonly {
      color: #bbb;
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

    .Cql__Button {
      background-color: transparent;
      border: 2px solid #aaa;
      color: #eee;
      border-radius: 3px;
      font-size: 1em;
      padding: 2px 9px;
    }

    .Cql__AbsoluteDateOption {
      display: flex;
      gap: 5px;
    }

    .Cql__TypeaheadPopoverContainer, .Cql__ErrorPopover {
      position: absolute;
      width: 500px;
      height: 100%;
      max-height: min(80vh, 400px);
      margin: 0;
      padding: 0;
      background: none;
      border: none;
    }

    .Cql__TypeaheadPopover {
      width: 100%;
      max-height: 100%;
      font-size: ${baseFontSize}px;
      border-radius: ${baseBorderRadius}px;
      color: #eee;
      background-color: #242424;
      border: 2px solid grey;
      overflow-y: scroll;
    }

    .Cql__TextSuggestionContent {
      width: 100%;
      height: 100%;
    }

    .Cql__ErrorPopover {
      display: none;
      width: max-content;
      background: transparent;
      border: none;
      color: red;
    }

    .Cql__ErrorPopover:after {
      content: '~'
    }

    .Cql__ErrorMessageContainer {
      display: none;
    }

    @keyframes placeHolderShimmer{
      0%{
          background-position: -468px 0
      }
      100%{
          background-position: 468px 0
      }
    }

    .${CLASS_PENDING} {
      position: relative;
      color: #bbb;
      animation-duration: 1.25s;
      animation-fill-mode: forwards;
      animation-iteration-count: infinite;
      animation-name: placeHolderShimmer;
      animation-timing-function: linear;
      background: darkgray;
      background: linear-gradient(to right, rgba(255,255,255,0.1) 10%, rgba(255,255,255,0.2) 18%, rgba(255,255,255,0.1) 33%);
      background-size: 200% 2em;

    }

    .${CLASS_VISIBLE} {
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
  cqlSuggestionService: CqlSuggestionService,
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
        <div id="${cqlTypeaheadId}" class="Cql__TypeaheadPopoverContainer" data-testid="${typeaheadTestId}" popover></div>
        <div id="${cqlErrorId}" class="Cql__ErrorPopover" data-testid="${errorTestId}" popover></div>
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
        cqlSuggestionsService: cqlSuggestionService,
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
      editorView.dom.classList.add("Cql__ContentEditable");
    }

    disconnectedCallback() {
      this.editorView?.destroy();
    }
  }

  return CqlInput;
};
