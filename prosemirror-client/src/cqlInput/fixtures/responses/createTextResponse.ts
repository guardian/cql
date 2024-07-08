export const createTextResponse = (text: string) => ({
  tokens: [
    {
      type: "Token",
      tokenType: "STRING",
      lexeme: text,
      start: 0,
      end: text.length - 1,
      literal: text,
    },
    {
      type: "Token",
      tokenType: "EOF",
      lexeme: "",
      start: text.length,
      end: text.length,
      literal: null,
    },
  ],
  ast: {
    type: "QueryList",
    content: [
      {
        type: "QueryBinary",
        left: {
          type: "QueryContent",
          searchExpr: text,
        },
        right: null,
      },
    ],
  },
  queryResult: `q=${text}`,
  suggestions: [],
  error: null,
});
