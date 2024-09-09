import { CqlResult } from "../../../lang/Cql";

export const createTextResponse = (text: string): CqlResult => ({
  tokens: [
    {
      tokenType: "STRING",
      lexeme: text,
      start: 0,
      end: text.length - 1,
      literal: text,
    },
    {
      tokenType: "EOF",
      lexeme: "",
      start: text.length,
      end: text.length,
      literal: undefined,
    },
  ],
  ast: {
    type: "QueryList",
    content: [
      {
        type: "QueryBinary",
        left: {
          type: "QueryContent",
          content: {
            type: "QueryStr",
            searchExpr: text,
          },
        },
        right: undefined,
      },
    ],
  },
  queryResult: `q=${text}`,
  suggestions: [],
  error: undefined,
});
