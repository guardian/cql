import { CqlBinary, CqlExpr, CqlField } from "./ast";

const whitespaceR = /\s/;
export const hasWhitespace = (str: string) => whitespaceR.test(str);

const letterOrDigitR = /[0-9A-z]/;
export const hasLetterOrDigit = (str: string) => letterOrDigitR.test(str);

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

export const getCqlFieldsFromQueryExpr = (
  queryContent: CqlExpr,
): CqlField[] => {
  switch (queryContent.content.type) {
    case "CqlField":
      return [queryContent.content];
    default:
      return [];
  }
};
