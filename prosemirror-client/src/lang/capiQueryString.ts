import { err, ok, Result } from "../utils/result";
import { Query, QueryBinary, QueryContent } from "./ast";
import { getQueryFieldsFromQueryBinary } from "./utils";

class CapiQueryStringError extends Error {
  public constructor(message: string) {
    super(message);
  }
}

export const queryStrFromQueryList = (query: Query): Result<Error, string> => {
  const { content } = query;
  if (!content) {
    return ok("");
  }

  const searchStrs = strFromBinary(content);

  try {
    const otherQueries = getQueryFieldsFromQueryBinary(content).flatMap(
      (expr) => {
        switch (expr.type) {
          case "QueryField": {
            if (expr.value) {
              return [`${expr.key.literal ?? ""}=${expr.value.literal ?? ""}`];
            } else {
              throw new CapiQueryStringError(
                `The field '${expr.key.literal}' needs a value after it (e.g. '${expr.key.literal}:tone/news')`
              );
            }
          }
          default: {
            return [];
          }
        }
      }
    );

    const queryStr = searchStrs.length
      ? `q=${encodeURI(searchStrs.trim())}`
      : "";

    return ok([queryStr, otherQueries].filter(Boolean).flat().join("&"));
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
      return `(${strFromBinary(content.content).trim()})`;
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
    ? `${queryBinary.right[0].lexeme} ${strFromBinary(queryBinary.right[1])}`
    : "";

  return (leftStr ?? "") + (rightStr ? ` ${rightStr.trim()} ` : "");
};
