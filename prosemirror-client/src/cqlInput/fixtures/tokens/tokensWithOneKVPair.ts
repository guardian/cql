import { Token } from "../../../lang/token";

export default [
  {
    tokenType: "STRING",
    lexeme: "text ",
    start: 0,
    end: 3,
    literal: "text ",
  },
  {
    tokenType: "QUERY_FIELD_KEY",
    lexeme: "+key",
    start: 5,
    end: 8,
    literal: "key",
  },
  {
    tokenType: "QUERY_VALUE",
    lexeme: ":value",
    start: 9,
    end: 14,
    literal: "value",
  },
  {
    tokenType: "STRING",
    lexeme: "text",
    start: 16,
    end: 19,
    literal: "text",
  },
  {
    tokenType: "EOF",
    lexeme: "",
    start: 20,
    end: 20,
    literal: null,
  },
] as Token[];
