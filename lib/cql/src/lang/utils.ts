import { CqlBinary, CqlExpr, CqlField } from "./ast";

const whitespaceR = /\s/;
export const hasWhitespace = (str: string) => whitespaceR.test(str);

const reservedChar = /(?<escapedChar>[:()"])/g;
export const hasReservedChar = (str: string) => reservedChar.test(str);

const escapedChar = /\\(?<escapedChar>[:()"])/g
export const unescapeStr = (str: string) => str.replaceAll(escapedChar, "$1")

export const escapeStr = (str: string) => str.replaceAll(reservedChar, "\\$1")

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

const getCqlFieldsFromQueryExpr = (
  queryContent: CqlExpr,
): CqlField[] => {
  switch (queryContent.content.type) {
    case "CqlField":
      return [queryContent.content];
    default:
      return [];
  }
};
