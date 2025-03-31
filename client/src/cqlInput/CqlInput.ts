import { EditorView } from "prosemirror-view";
import { QueryChangeEventDetail } from "../types/dom";
import { createEditorView } from "./editor/editor";
import { createCqlPlugin, CLASS_VISIBLE } from "./editor/plugin";
import {
  CLASS_PENDING,
  RenderPopoverContent,
} from "./popover/TypeaheadPopover";
import { Typeahead } from "../lang/typeahead";
import { applyPartialTheme, CqlTheme } from "./theme";
import { ScannerSettings } from "../lang/scanner";

export const contentEditableTestId = "cql-input-contenteditable";
export const typeaheadTestId = "cql-input-typeahead";
export const errorTestId = "cql-input-error";
export const errorMsgTestId = "cql-input-error-message";

export type CqlConfig = {
  syntaxHighlighting?: boolean;
  debugEl?: HTMLElement;
  renderPopoverContent?: RenderPopoverContent;
  theme?: Partial<CqlTheme>;
  lang?: Partial<ScannerSettings>;
};

export const createCqlInput = (
  typeahead: Typeahead,
  config: CqlConfig = {
    syntaxHighlighting: true,
    theme: {},
    lang: {},
  }
) => {
  class CqlInput extends HTMLElement {
    static observedAttributes = ["initialValue"];

    public editorView: EditorView | undefined;

    public value = "";

    connectedCallback() {
      const cqlInputId = "cql-input";
      const cqlTypeaheadId = "cql-typeahead";
      const cqlErrorId = "cql-error";
      const shadow = this.attachShadow({ mode: "closed" });

      shadow.innerHTML = `
        <div id="${cqlInputId}" spellcheck="false"></div>
        <div id="${cqlTypeaheadId}" class="Cql__TypeaheadPopoverContainer" data-testid="${typeaheadTestId}" popover></div>
        <div id="${cqlErrorId}" class="Cql__ErrorPopover" data-testid="${errorTestId}" popover></div>
      `;

      const template = this.createTemplate(config.theme ?? {});
      shadow.appendChild(template.content.cloneNode(true));

      const cqlInput = shadow.getElementById(cqlInputId)!;
      const typeaheadEl = shadow.getElementById(cqlTypeaheadId)!;
      const errorEl = shadow.getElementById(cqlErrorId)!;

      const onChange = (detail: QueryChangeEventDetail) => {
        this.value = detail.queryStr;
        this.dispatchEvent(
          new CustomEvent("queryChange", {
            detail,
          })
        );
      };

      const plugin = createCqlPlugin({
        typeahead,
        typeaheadEl,
        errorEl,
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

    public createTemplate(partialTheme: Partial<CqlTheme>) {
      const { input, tokens, chipWrapper, baseBorderRadius, baseFontSize } =
        applyPartialTheme(partialTheme);
      const template = document.createElement("template");
      template.innerHTML = `
        <style>
          * {
            box-sizing: border-box;
          }

          .ProseMirror {
            white-space: pre-wrap;
          }

          query-str {
            /* Ensure there's always space for input */
            display: inline-block;
            min-width: 5px;
          }

          chip-wrapper {
            display: inline-flex;
            background-color: ${chipWrapper.colors.background};
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

          ${Object.entries(tokens.colors)
            .map(([token, color]) => `.CqlToken__${token} { color: ${color}; }`)
            .join("\n")}

          #cql-input {
            display: block;
            position: relative;
            font-size: ${baseFontSize}px;
            line-height: initial;
          }

          .Cql__ContentEditable {
            padding: ${input.layout.padding};
            border-radius: ${baseBorderRadius}px;
          }

          .Cql__ContentEditable:focus {
            outline: none;
          }

          .Cql__PopoverTabs {
            display: flex;
            flex-direction: column;
            height: 100%;
          }

          .Cql__PopoverTabHeader {
            display: flex;
            flex-grow: 0;
          }

          .Cql__PopoverTabItem {
            color: #bbb;
            cursor: pointer;
            flex-grow: 1;
            text-align: center;
            border-bottom: 2px solid #495e65;
          }

          .Cql__PopoverTabContentContainer {
            overflow-y: scroll;
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
            font-weight: bold;
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
            font-weight: normal;
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
            max-height: fit-content;
            height: 100%;
            font-size: ${baseFontSize}px;
            border-radius: ${baseBorderRadius}px;
            color: #eee;
            background-color: #242424;
            border: 2px solid grey;
            overflow: hidden;
          }

          .Cql__TextSuggestionContainer {
            width: 100%;
            height: 100%;
            max-height: fit-content;
            overflow-y: scroll;
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

          @keyframes placeHolderShimmer {
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

      return template;
    }
  }

  return CqlInput;
};
