import { Token } from "../../../lang/token";

export default [
  {
    tokenType: "LEFT_BRACKET",
    lexeme: "(",
    start: 0,
    end: 0,
    literal: null,
  },
  {
    tokenType: "STRING",
    lexeme: "b",
    start: 1,
    end: 1,
    literal: "b",
  },
  {
    tokenType: "OR",
    lexeme: "OR",
    start: 3,
    end: 4,
    literal: null,
  },
  {
    tokenType: "STRING",
    lexeme: "c",
    start: 6,
    end: 6,
    literal: "c",
  },
  {
    tokenType: "RIGHT_BRACKET",
    lexeme: ")",
    start: 7,
    end: 7,
    literal: null,
  },
  {
    tokenType: "EOF",
    lexeme: "",
    start: 8,
    end: 8,
    literal: null,
  },
] as Token[];
