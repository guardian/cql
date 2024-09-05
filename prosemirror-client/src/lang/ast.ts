import { Token } from "./token";

export type QueryArray = {
  type: "QueryArray";
  content: (QueryBinary | QueryField)[];
};

export const createQueryArray = (
  content: QueryArray["content"]
): QueryArray => ({
  type: "QueryArray",
  content,
});

export type QueryBinary = {
  type: "QueryBinary";
  left: QueryContent;
  right?: [Token, QueryBinary

  ];
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
  content: QueryStr | QueryBinary | QueryGroup;
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

export type QueryStr = { type: "QueryStr"; searchExpr: string };

export const createQueryStr = (searchExpr: string): QueryStr => ({
  type: "QueryStr",
  searchExpr,
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
