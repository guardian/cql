import { Token } from "./token";

export type Query = {
  type: "Query";
  content?: QueryBinary;
};

export const createQuery = (content?: QueryBinary): Query => ({
  type: "Query",
  content,
});

export type QueryBinary = {
  type: "QueryBinary";
  left: QueryContent;
  right?: [Token, QueryBinary];
};

export const createQueryBinary = (
  left: QueryBinary["left"],
  right?: QueryBinary["right"]
): QueryBinary => ({
  type: "QueryBinary",
  left,
  right,
});

export type QueryContent = {
  type: "QueryContent";
  content: QueryStr | QueryBinary | QueryGroup | QueryField;
};

export const createQueryContent = (
  content: QueryContent["content"]
): QueryContent => ({
  type: "QueryContent",
  content,
});

export type QueryGroup = { type: "QueryGroup"; content: QueryBinary };

export const createQueryGroup = (
  content: QueryGroup["content"]
): QueryGroup => ({
  type: "QueryGroup",
  content,
});

export type QueryStr = { type: "QueryStr"; searchExpr: string; token: Token };

export const createQueryStr = (token: Token): QueryStr => ({
  type: "QueryStr",
  searchExpr: token.literal ?? "",
  token,
});

export type QueryField = { type: "QueryField"; key: Token; value?: Token };

export const createQueryField = (
  key: QueryField["key"],
  value: QueryField["value"]
): QueryField => ({
  type: "QueryField",
  key,
  value,
});
