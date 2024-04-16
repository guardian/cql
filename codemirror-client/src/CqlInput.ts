import { basicSetup, EditorView } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";

export class CqlInput extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: "closed" });

    shadow.innerHTML = `<div id="cql-input"></div>`;
    const cqlInput = shadow.getElementById("cql-input")!;

    this.setupEditor(cqlInput);
  }

  setupEditor = (mountEl: HTMLElement) => {
    const tabSize = new Compartment();

    let state = EditorState.create({
      extensions: [basicSetup, tabSize.of(EditorState.tabSize.of(8))],
    });

    new EditorView({
      state,
      parent: mountEl,
    });
  };
}
