import { CqlBinary, CqlExpr, CqlType, CqlTypeMap } from "./ast";

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

export const getCqlTermFromCqlBinary = <T extends CqlType>(
  queryBinary: CqlBinary,
  type: T,
): CqlTypeMap[T][] => {
  const left = getCqlTermFromQueryExpr(
    queryBinary.left,
    type,
  ) as CqlTypeMap[T][];

  const right = queryBinary.right
    ? getCqlTermFromCqlBinary(queryBinary.right.binary, type)
    : [];

  return left.concat(right);
};
const getCqlTermFromQueryExpr = <T extends CqlType>(
  queryContent: CqlExpr,
  type: T,
): CqlTypeMap[CqlExpr["content"]["type"]][] => {
  switch (queryContent.content.type) {
    case type:
      return [queryContent.content];
    default:
      return [];
  }
};
