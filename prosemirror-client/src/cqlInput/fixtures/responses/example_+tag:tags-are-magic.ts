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
      lexeme: ":tags-are-magic",
      start: 12,
      end: 26,
      literal: "tags-are-magic",
    },
    {
      tokenType: "EOF",
      lexeme: "",
      start: 29,
      end: 29,
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
          lexeme: ":tags-are-magic",
          start: 12,
          end: 26,
          literal: "tags-are-magic",
        },
      },
    ],
  },
  queryResult: "q=example&tag=tags-are-magic",
  suggestions: [
    {
      from: 8,
      to: 11,
      suffix: ":",
      type: "TEXT",
      suggestions: [
        {
          label: "Tag",
          value: "tag",
        },
      ],
    },
    {
      from: 12,
      to: 26,
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
