import { CqlBinary, CqlExpr, CqlField } from "./ast";
import { Token } from "./token";

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

type SuggestionPos =
  | undefined
  | { key: Token; value: undefined }
  | { key: Token; value: Token };

export const getAstNodeAtPos = (
  queryBinary: CqlBinary,
  position: number,
): SuggestionPos => {
  return (
    getAstNodeAtPosExpr(queryBinary.left, position) ??
    (queryBinary.right
      ? getAstNodeAtPos(queryBinary.right.binary, position)
      : undefined)
  );
};

export const getAstNodeAtPosExpr = (
  expr: CqlExpr,
  position: number,
): SuggestionPos => {
  switch (expr.content.type) {
    case "CqlStr": {
      const key = isWithinRange(expr.content.token, position);

      return key
        ? {
            key,
            value: undefined,
          }
        : undefined;
    }
    case "CqlBinary":
      return getAstNodeAtPos(expr.content, position);
    case "CqlGroup":
      return getAstNodeAtPos(expr.content.content, position);
    case "CqlField": {
      const key = isWithinRange(expr.content.key, position);
      const value = isWithinRange(expr.content.value, position);

      if (!key && !value) {
        return undefined;
      }

      if (key && !value) {
        return { key, value: undefined };
      }

      return {
        key: expr.content.key,
        value,
      };
    }
  }
};

const isWithinRange = (
  token: Token | undefined,
  position: number,
): Token | undefined => {
  return token && position >= token.start && position <= token.end
    ? token
    : undefined;
};
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
