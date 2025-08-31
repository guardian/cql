import { Decoration } from "prosemirror-view";
import { CLASS_ERROR } from "./plugins/cql";
import { mapTokens, ProseMirrorToken } from "./utils";
import { CqlQuery } from "../../lib";
import { Mapping } from "prosemirror-transform";
import { Selection } from "prosemirror-state";
import { getCqlTermFromCqlBinary } from "../../lang/utils";

const tokensThatAreNotDecorated = ["CHIP_KEY", "CHIP_VALUE", "EOF"];

export const errorToDecoration = (position: number): Decoration => {
  const toDOM = () => {
    const el = document.createElement("span");
    el.classList.add(CLASS_ERROR);
    return el;
  };

  return Decoration.widget(position, toDOM);
};

export const tokensToDecorations = (
  tokens: ProseMirrorToken[],
): Decoration[] => {
  return mapTokens(tokens)
    .filter((token) => !tokensThatAreNotDecorated.includes(token.tokenType))
    .map(({ from, to, tokenType }) =>
      Decoration.inline(
        from,
        to,
        { class: `CqlToken__${tokenType}` },
        { key: `${from}-${to}` },
      ),
    );
};

export const createGroupDecorations = (
  selection: Selection,
  queryAst: CqlQuery,
  mapping: Mapping,
): Decoration[] => {
  if (!queryAst.content) {
    return [];
  }
  const groups = getCqlTermFromCqlBinary(queryAst.content, "CqlGroup");

  return [];
};
