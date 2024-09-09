import { CqlResult } from "../../../lang/Cql";

export default {
  tokens: [
    {
      tokenType: "EOF",
      lexeme: "",
      start: 0,
      end: 0,
      literal: undefined,
    },
  ],
  ast: {
    type: "QueryList",
    content: [],
  },
  queryResult: "q=example",
  suggestions: [],
  error: undefined,
} as CqlResult;
