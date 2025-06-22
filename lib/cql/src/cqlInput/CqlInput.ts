import { EditorView } from "prosemirror-view";
import { QueryChangeEventDetail } from "../types/dom";
import { createEditorView } from "./editor/editor";
import {
  createCqlPlugin,
  CLASS_VISIBLE,
  CLASS_CHIP_SELECTED,
  CLASS_CHIP_KEY_READONLY,
} from "./editor/plugins/cql";
import {
  CLASS_NO_RESULTS,
  CLASS_PENDING,
  RenderPopoverContent,
} from "./popover/TypeaheadPopover";
import { Typeahead } from "../lang/typeahead";
import { applyPartialTheme, CqlTheme } from "./theme";
import { ScannerSettings } from "../lang/scanner";
import { DeepPartial } from "../types/utils";
import { createParser } from "../lang/Cql";
import { cqlQueryStrFromQueryAst } from "../lang/interpreter";
import { CLASSNAME_PLACEHOLDER } from "./editor/plugins/placeholder";

export const typeaheadTestId = "cql-input-typeahead";
export const errorTestId = "cql-input-error";
export const errorMsgTestId = "cql-input-error-message";

export type CqlConfig = {
  syntaxHighlighting?: boolean;
  debugEl?: HTMLElement;
  renderPopoverContent?: RenderPopoverContent;
  theme?: DeepPartial<CqlTheme>;
  lang?: Partial<ScannerSettings>;
};

export const createCqlInput = (
  typeahead: Typeahead,
  config: CqlConfig = {
    syntaxHighlighting: true,
    theme: {},
    lang: {},
  },
) => {
  class CqlInput extends HTMLElement {
    static observedAttributes = ["value", "placeholder"];

    public editorView: EditorView | undefined;
    public value = "";
    public updateEditorView: ((str: string) => void) | undefined = undefined;
    public parseCqlStr: ReturnType<typeof createParser> | undefined =
      undefined;

    connectedCallback() {
      const cqlInputId = "cql-input";
      const cqlTypeaheadId = "cql-typeahead";
      const cqlErrorId = "cql-error";
      const shadow = this.attachShadow({ mode: "open" });

      const initialValue = this.getAttribute("value") ?? "";
      const placeholder = this.getAttribute("placeholder") ?? undefined;

      shadow.innerHTML = `
        <div id="${cqlInputId}" spellcheck="false"></div>
        <div id="${cqlTypeaheadId}" class="Cql__TypeaheadPopoverContainer" data-testid="${typeaheadTestId}" popover="manual"></div>
        <div id="${cqlErrorId}" class="Cql__ErrorPopover" data-testid="${errorTestId}" popover="manual"></div>
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
          }),
        );
      };

      this.parseCqlStr = createParser(config.lang);

      const plugin = createCqlPlugin({
        typeahead,
        typeaheadEl,
        errorEl,
        onChange,
        config,
        parser: this.parseCqlStr,
      });

      const { editorView, updateEditorView } = createEditorView({
        initialValue,
        placeholder,
        mountEl: cqlInput,
        plugins: [plugin],
        parser: this.parseCqlStr,
      });

      editorView.dom.classList.add("Cql__ContentEditable");

      this.updateEditorView = updateEditorView;

      // Do not leak events to the wider DOM
      ["keydown", "keyup", "keypress"].forEach((eventName) =>
        this.stopPropagationForEvent(eventName, cqlInput),
      );
    }

    disconnectedCallback() {
      this.editorView?.destroy();
    }

    public attributeChangedCallback(
      name: string,
      _oldValue: string,
      newValue: string,
    ) {
      if (!this.parseCqlStr) {
        return;
      }

      switch (name) {
        case "value": {
          // We defend here against updating the view if the underlying query
          // has not changed, because updating the underlying query is likely to
          // disrupt the user selection. As an optimisation, we run a basic
          // equivalence check, before normalising the new value and comparing
          // it against the old one.
          const basicValueHasNotChanged = newValue === this.value;
          if (basicValueHasNotChanged) {
            return;
          }
          const currentResult = this.parseCqlStr(this.value);
          const newResult = this.parseCqlStr(newValue);

          // This is a little dangerous: we are assuming that the incoming query is well formed.
          if (!newResult.queryAst) {
            return;
          }

          const normalisedValueHasChanged =
            (currentResult.queryAst &&
              cqlQueryStrFromQueryAst(currentResult.queryAst)) !==
            cqlQueryStrFromQueryAst(newResult.queryAst);

          if (normalisedValueHasChanged) {
            this.updateEditorView?.(newValue);
          }
        }
      }
    }

    public createTemplate(partialTheme: DeepPartial<CqlTheme>) {
      const {
        input,
        tokens,
        chipWrapper,
        baseBorderRadius,
        baseFontSize,
        chipContent,
        chipHandle,
        typeahead,
      } = applyPartialTheme(partialTheme);
      const template = document.createElement("template");
      template.innerHTML = `
        <style>
          * {
            box-sizing: border-box;
          }

          .Cql__ContentEditable {
            display: inline-flex;
            align-items: center;
            white-space: pre-wrap;
            overflow-x: scroll;
          }

          query-str {
            /* We apply wrapper padding here to ensure that when there is no chip, the input does not shrink */
            padding: ${chipContent.layout.padding};
            /* Ensure there's always space for input */
            min-width: 5px;
            flex-shrink: 0;
          }

          chip-wrapper {
            display: inline-flex;
            flex-shrink: 0;
            background-color: ${chipWrapper.color.background};
            margin: 0 5px;
            border-radius: ${baseBorderRadius};
          }

          chip-key {
            /* This is to ensure the separator between key and value (':') remains aligned with the chip content */
            display: inline;
            padding: 0 5px;
          }

          chip-value {
            flex-shrink: 0;
            padding-right: 5px;
          }

          ${Object.entries(tokens.color)
            .map(([token, color]) => `.CqlToken__${token} { color: ${color}; }`)
            .join("\n")}

          #cql-input {
            display: block;
            position: relative;
            font-size: ${baseFontSize};
            line-height: initial;
          }

          .Cql__ContentEditable {
            width: 100%;
            padding: ${input.layout.padding};
            border-radius: ${baseBorderRadius};
          }

          .Cql__ContentEditable:focus {
            outline: none;
          }

          .Cql__PopoverTabs {
            display: flex;
            flex-direction: column;
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
            border-bottom: 1px solid #495e65;
          }

          .Cql__PopoverTabContentContainer {
            overflow-y: scroll;
          }

          .Cql__PopoverTabItem:hover,
          .Cql__PopoverTabItem--active {
            background-color: rgba(255,255,255,0.1);
            color: #eee;
            border-bottom: 1px solid lightblue;
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
            font-size: calc(${baseFontSize} * 0.8);
          }

          .Cql__ChipKey--readonly {
            color: ${chipContent.color.readonly};
          }

          .Cql__ChipWrapperContent {
            display: inline-flex;
            padding: ${chipContent.layout.padding};
          }

          .Cql__ChipWrapper--is-pending-delete {
            box-shadow: 0 0 0 1px #c52b2b;
            overflow: hidden;
          }

          .${CLASS_CHIP_SELECTED} {
            background-color: #334fa3;
          }

          .Cql__ChipWrapperDeleteHandle, .Cql__ChipWrapperPolarityHandle {
            display: inline-flex;
            align-items: center;
            background-color: ${chipHandle.color.background};
            padding: 0 5px;
            cursor: pointer;
          }

          .Cql__ChipWrapperDeleteHandle {
            border-radius: 0 ${baseBorderRadius} ${baseBorderRadius} 0;
            ${chipHandle.color.border ? `border-left: 1px solid ${chipHandle.color.border}` : ""} ;
          }

          .Cql__ChipWrapperPolarityHandle {
            border-radius: ${baseBorderRadius} 0 0 ${baseBorderRadius};
            ${chipHandle.color.border ? `border-right: 1px solid ${chipHandle.color.border}` : ""} ;
          }

          .Cql__TypeaheadDateInput {
            width: 100%;
            border-radius: ${baseBorderRadius};
            border: none;
          }

          .Cql__Button {
            background-color: transparent;
            border: 1px solid #aaa;
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
            width: ${typeahead.layout.width};
            height: 100%;
            max-height: min(80vh, 400px);
            margin: 0;
            padding: 0;
            background: none;
            border: none;
          }

          .Cql__TypeaheadPopover {
            display: flex;
            width: 100%;
            max-height: 100%;
            font-size: ${baseFontSize};
            border-radius: ${baseBorderRadius};
            color: #eee;
            background-color: #242424;
            border: 1px solid grey;
            overflow: hidden;
          }

          .Cql__TextSuggestionContainer {
            width: 100%;
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

          .${CLASS_CHIP_KEY_READONLY} {
            pointer-events: none;
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

          .${CLASS_NO_RESULTS} {
            opacity: 0.5;
          }

          .${CLASS_VISIBLE} {
            display: block;
          }

          .${CLASSNAME_PLACEHOLDER} {
            display: inline-block;
            position: absolute;
            width: 100%;
            left: 0;
            top: 0;
            padding: calc(${input.layout.padding} + ${chipContent.layout.padding});
            white-space: nowrap;
            overflow-x: hidden;
            text-overflow: ellipsis;
            vertical-align: bottom;
            /* Passes accessibility contrast on a white background */
            color: #777575;
            pointer-events: none;
            cursor: text;
          }
        </style>
      `;

      return template;
    }

    public stopPropagationForEvent = (
      eventName: string,
      element: HTMLElement,
    ) => element.addEventListener(eventName, (e) => e.stopPropagation());
  }

  return CqlInput;
};
