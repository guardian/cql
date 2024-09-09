import { CqlResult } from "../../../lang/Cql";

export default {
  tokens: [
    {
      tokenType: "STRING",
      lexeme: "example",
      start: 0,
      end: 6,
      literal: "example",
    },
    {
      tokenType: "QUERY_FIELD_KEY",
      lexeme: "+",
      start: 8,
      end: 8,
      literal: undefined,
    },
    {
      tokenType: "QUERY_VALUE",
      lexeme: ":",
      start: 9,
      end: 9,
      literal: undefined,
    },
    {
      tokenType: "EOF",
      lexeme: "",
      start: 12,
      end: 12,
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
          searchExpr: "example",
        },
        right: undefined,
      },
      {
        type: "QueryField",
        key: {
          tokenType: "QUERY_FIELD_KEY",
          lexeme: "+",
          start: 8,
          end: 8,
          literal: undefined,
        },
        value: {
          tokenType: "QUERY_VALUE",
          lexeme: ":",
          start: 9,
          end: 9,
          literal: undefined,
        },
      },
    ],
  },
  queryResult: "q=example&=",
  suggestions: [
    {
      from: 8,
      to: 8,
      suffix: ":",
      type: "TEXT",
      suggestions: [
        {
          label: "Tag",
          value: "tag",
        },
        {
          label: "Section",
          value: "section",
        },
      ],
    },
    {
      from: 9,
      to: 9,
      suffix: " ",
      type: "TEXT",
      suggestions: [],
    },
  ],
  error: undefined,
} as CqlResult;
