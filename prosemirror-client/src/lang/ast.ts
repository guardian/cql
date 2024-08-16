export type Query = QueryList | QueryStr | QueryField | QueryOutputModifier;

export type QueryList = {
  type: "QueryList";
  exprs: Array<QueryBinary | QueryField | QueryOutputModifier>;
};

export type QueryBinary = {
  type: "QueryBinary";
  left: QueryContent;
  right?: [Token, QueryBinary];
};

export type QueryContent = {
  type: "QueryContent";
  content: QueryStr | QueryBinary | QueryGroup;
};

export type QueryGroup = {
  type: "QueryGroup";
  content: QueryBinary;
};

export type QueryStr = {
  type: "QueryStr";
  searchExpr: String;
};

export type QueryField = {
  type: "QueryField";
  key: Token;
  value?: Token;
};

export type QueryOutputModifier = {
  type: "QueryOutputModifier";
  key: Token;
  value: Token;
};
