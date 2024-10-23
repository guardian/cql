import { err, ok, Result } from "../utils/result";
import { QueryBinary, QueryContent, QueryList } from "./ast";
import { getQueryFieldsFromQueryList } from "./util";

class CapiQueryStringError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export const queryStrFromQueryList = (
  program: QueryList
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
    const otherQueries = getQueryFieldsFromQueryList(program).flatMap(
      (expr) => {
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
      }
    );

    const maybeSearchStr = searchStrs.join(" ").trim();

    const searchStr = maybeSearchStr.length
      ? `q=${encodeURI(maybeSearchStr)}`
      : "";

    return ok([searchStr, otherQueries].filter(Boolean).flat().join("&"));
  } catch (e) {
    return err(e as Error);
  }
};

const strFromContent = (queryContent: QueryContent): string | undefined => {
  const { content } = queryContent;
  switch (content.type) {
    case "QueryStr":
      return content.searchExpr;
    case "QueryGroup":
      return `(${strFromBinary(content.content)})`;
    case "QueryBinary":
      return strFromBinary(content);
    default:
      // Ignore fields
      return;
  }
};

const strFromBinary = (queryBinary: QueryBinary): string => {
  const leftStr = strFromContent(queryBinary.left);
  const rightStr = queryBinary.right
    ? `${queryBinary.right[0].tokenType.toString()} ${strFromBinary(
        queryBinary.right[1]
      )}`
    : "";
  return (leftStr ?? " ") + (rightStr ? ` ${rightStr}` : "");
};
