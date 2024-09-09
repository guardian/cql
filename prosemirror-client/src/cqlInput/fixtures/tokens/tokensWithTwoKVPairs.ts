import { Token } from "../../../lang/token";

export default [
  {
    tokenType: "STRING",
    lexeme: "text",
    start: 0,
    end: 3,
    literal: "text",
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
    tokenType: "QUERY_FIELD_KEY",
    lexeme: "+key2",
    start: 21,
    end: 25,
    literal: "key2",
  },
  {
    tokenType: "QUERY_VALUE",
    lexeme: ":value2",
    start: 26,
    end: 32,
    literal: "value2",
  },
  {
    tokenType: "EOF",
    lexeme: "",
    start: 33,
    end: 33,
    literal: null,
  },
] as Token[];
