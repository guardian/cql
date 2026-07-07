import { describe, it } from "bun:test";
import { Wordgard, KeyBinding } from "wordgard/editor";
import { history } from "wordgard/history";
import { createParser } from "../../../lang/Cql";
import { TestTypeaheadHelpers } from "../../../lang/fixtures/TestTypeaheadHelpers";
import { Typeahead } from "../../../lang/typeahead";
import {
  queryToProseMirrorDoc,
  getNodeTypeAtSelection,
  docToCqlStr,
  mapResult,
  toMappedSuggestions,
} from "../utils";
import { createCqlPlugin } from "./cql";
import { WordgardTestChain } from "../wordgardTestChain";

const helpers = new TestTypeaheadHelpers();
const ta = new Typeahead(helpers.typeaheadFields);

const make = (q: string) => {
  document.body.innerHTML = "";
  const typeaheadEl = document.createElement("div");
  const errorEl = document.createElement("div");
  document.body.appendChild(typeaheadEl);
  document.body.appendChild(errorEl);
  const parser = createParser();
  const plugin = createCqlPlugin({
    typeahead: ta,
    typeaheadEl,
    errorEl,
    config: { syntaxHighlighting: true },
    onChange: () => {},
    parser,
  });
  document.getSelection()?.removeAllRanges();
  const view = Wordgard.create({
    parent: document.body,
    doc: queryToProseMirrorDoc(q, parser),
    config: [
      plugin,
      KeyBinding.of({ key: "Mod-z", run: () => false }),
      history(),
    ],
  });
  const editor = new WordgardTestChain(view);
  editor.selectText("end");
  view.focus();
  return { view, editor, parser };
};

const logSuggestions = async (label: string, initial: string, type: string) => {
  const { view, editor, parser } = make(initial);
  editor.insertText(type);
  await Promise.resolve();
  const query = docToCqlStr(view.state.doc);
  const { queryAst, mapping } = mapResult(parser(query));
  console.log(`\n=== ${label}: initial='${initial}' typed='${type}' ===`);
  console.log("query str:", JSON.stringify(query));
  console.log(
    "selection from/to:",
    view.state.selection.from,
    view.state.selection.to,
    "nodeType:",
    getNodeTypeAtSelection(view.state).name,
  );
  console.log("doc length:", view.state.doc.length);
  view.state.doc.iterate((n, pos) => {
    console.log("  node", n.type?.name, "pos", pos, "len", n.length);
    return undefined;
  });
  if (!queryAst) {
    console.log("NO queryAst");
    return;
  }
  const suggestions = await ta.getSuggestions(queryAst).catch((e) => {
    console.log("getSuggestions error:", e?.name);
    return [];
  });
  console.log(
    "raw suggestions:",
    JSON.stringify(
      suggestions.map((s) => ({
        from: s.from,
        to: s.to,
        position: s.position,
        n: s.suggestions.length,
      })),
    ),
  );
  const mapped = toMappedSuggestions(suggestions, mapping);
  console.log(
    "mapped suggestions:",
    JSON.stringify(
      mapped.map((s) => ({ from: s.from, to: s.to, position: s.position })),
    ),
  );
  const sel = view.state.selection;
  mapped.forEach((s) => {
    console.log(
      `  covers? from=${s.from} to=${s.to} sel.from=${sel.from} sel.to=${sel.to} =>`,
      sel.from >= s.from && sel.to <= s.to,
    );
  });
};

describe("probe popover", () => {
  it("+ at start (FAILS)", async () => {
    await logSuggestions("plus-at-start", "", "+");
  });
  it("example + (PASSES)", async () => {
    await logSuggestions("example-plus", "", "example +");
  });
});
