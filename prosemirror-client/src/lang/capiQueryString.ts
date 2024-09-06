import { err, ok, Result } from "../util/result";
import { QueryBinary, QueryContent, QueryArray } from "./ast";

class CapiQueryStringError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export const queryStrFromQueryArray = (
  program: QueryArray
): Result<Error, string> => {
  const searchStrs = program.content.flatMap((expr) => {
    switch (expr.type) {
      case "QueryBinary":
        return [strFromBinary(expr)];
      default:
        return [];
    }
  });

  try {
    const otherQueries = program.content.flatMap((expr) => {
      switch (expr.type) {
        case "QueryField": {
          if (expr.value) {
            return [`${expr.key.literal ?? ""}=${expr.value.literal ?? ""}`];
          } else {
            throw new CapiQueryStringError(
              `The field '+$${expr.key}' needs a value after it (e.g. +${expr.key}:tone/news)`
            );
          }
        }
        default: {
          return [];
        }
      }
    });

    const maybeSearchStr = searchStrs.length
      ? `q=${encodeURI(searchStrs.join(" "))}`
      : "";

    return ok([maybeSearchStr, otherQueries].filter(Boolean).flat().join("&"));
  } catch (e) {
    return err(e as Error);
  }
};

const strFromContent = (queryContent: QueryContent): string => {
  const { content } = queryContent;
  switch (content.type) {
    case "QueryStr":
      return content.searchExpr;
    case "QueryGroup":
      return `(${strFromBinary(content.content)})`;
    case "QueryBinary":
      return strFromBinary(content);
  }
};

const strFromBinary = (queryBinary: QueryBinary): string => {
  const leftStr = strFromContent(queryBinary.left);
  const rightStr = queryBinary.right
    ? ` ${queryBinary.right[0].tokenType.toString()} ${strFromBinary(
        queryBinary.right[1]
      )}`
    : "";
  return leftStr + rightStr;
};
