type Token = {
  tokenType: string;
  lexeme: string;
  literal?: string;
  start: number;
  end: number;
};

type QueryList = {
  type: "QueryList";
  content: (QueryBinary | QueryField | QueryOutputModifier)[];
};
type QueryBinary = {
  type: "QueryBinary";
  left: QueryContent;
  right?: [Token, QueryContent];
};
type QueryContent = {
  type: "QueryContent";
  content: QueryStr | QueryBinary | QueryGroup;
};
type QueryGroup = { type: "QueryGroup"; content: QueryBinary };
type QueryStr = { type: "QueryStr"; searchExpr: string };
type QueryField = { type: "QueryField"; key: Token; value?: Token };
type QueryOutputModifier = {
  type: "QueryOutputModifier";
  key: Token;
  value?: Token;
};
