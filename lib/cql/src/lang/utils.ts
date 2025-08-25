import { CqlBinary, CqlExpr, CqlField } from "./ast";

const whitespaceR = /\s/;
export const hasWhitespace = (str: string) => !!str.match(whitespaceR);

const reservedChar = /(?<escapedChar>[:()"])/g;
export const hasReservedChar = (str: string) => !!str.match(reservedChar);

const escapedChar = /\\(?<escapedChar>[:()"])/g;
export const unescapeQuotes = (str: string) =>
  str.replaceAll(escapedChar, "$1");

export const escapeQuotes = (str: string) => str.replaceAll(`"`, `\\"`);

export const shouldQuoteFieldValue = (literal: string) =>
  hasWhitespace(literal) || hasReservedChar(literal);

export function* getPermutations<T>(
  permutation: T[],
): Generator<T[], T[], unknown> {
  const length = permutation.length,
    c = Array(length).fill(0);

  let i = 1,
    k,
    p;

  yield permutation.slice();
  while (i < length) {
    if (c[i] < i) {
      k = i % 2 && c[i];
      p = permutation[i];
      permutation[i] = permutation[k];
      permutation[k] = p;
      ++c[i];
      i = 1;
      yield permutation.slice();
    } else {
      c[i] = 0;
      ++i;
    }
  }

  return permutation.slice();
}

export const getCqlFieldsFromCqlBinary = (queryBinary: CqlBinary): CqlField[] =>
  getCqlFieldsFromQueryExpr(queryBinary.left).concat(
    queryBinary.right
      ? getCqlFieldsFromCqlBinary(queryBinary.right.binary)
      : [],
  );

const getCqlFieldsFromQueryExpr = (queryContent: CqlExpr): CqlField[] => {
  switch (queryContent.content.type) {
    case "CqlField":
      return [queryContent.content];
    default:
      return [];
  }
};
