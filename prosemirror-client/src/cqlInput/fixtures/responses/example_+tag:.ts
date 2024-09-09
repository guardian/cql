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
      lexeme: "+tag",
      start: 8,
      end: 11,
      literal: "tag",
    },
    {
      tokenType: "QUERY_VALUE",
      lexeme: ":",
      start: 12,
      end: 12,
      literal: undefined,
    },
    {
      tokenType: "EOF",
      lexeme: "",
      start: 16,
      end: 16,
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
          lexeme: "+tag",
          start: 8,
          end: 11,
          literal: "tag",
        },
        value: {
          tokenType: "QUERY_VALUE",
          lexeme: ":",
          start: 12,
          end: 12,
          literal: undefined,
        },
      },
    ],
  },
  queryResult: "q=example&tag=",
  suggestions: [
    {
      from: 8,
      to: 11,
      suffix: ":",
      suggestions: [
        {
          label: "Tag",
          value: "tag",
        },
      ],
      type: "TEXT",
    },
    {
      from: 12,
      to: 12,
      suffix: " ",
      type: "TEXT",
      suggestions: [
        {
          label: "Tags are magic",
          value: "tags-are-magic",
        },
      ],
    },
  ],
  error: undefined,
} as CqlResult;
