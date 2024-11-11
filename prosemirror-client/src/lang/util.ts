import { QueryBinary, QueryContent, QueryField } from "./ast";

const whitespaceR = /\s/;
export const isWhitespace = (str: string) => whitespaceR.test(str);

const letterOrDigitR = /[0-9A-z]/;
export const isLetterOrDigit = (str: string) => letterOrDigitR.test(str);

const reservedCharR = /[+:())]/;
export const isReservedChar = (str: string) => reservedCharR.test(str);

export function* getPermutations<T>(
  permutation: T[]
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

export const getQueryFieldsFromQueryBinary = (
  queryBinary: QueryBinary
): QueryField[] =>
  getQueryFieldsFromQueryContent(queryBinary.left).concat(
    queryBinary.right ? getQueryFieldsFromQueryBinary(queryBinary.right[1]) : []
  );

export const getQueryFieldsFromQueryContent = (
  queryContent: QueryContent
): QueryField[] => {
  switch (queryContent.content.type) {
    case "QueryField":
      return [queryContent.content];
    default:
      return [];
  }
};
