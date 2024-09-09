import { Token } from "../../../lang/token";

export default [
  {
    tokenType: "QUERY_FIELD_KEY",
    lexeme: "+tag",
    start: 0,
    end: 3,
    literal: "tag",
  },
  {
    tokenType: "QUERY_VALUE",
    lexeme: ":test",
    start: 4,
    end: 8,
    literal: "test",
  },
  {
    tokenType: "EOF",
    lexeme: "",
    start: 11,
    end: 11,
    literal: null,
  },
] as Token[];
