import { createQueryField, QueryField } from "./ast";
import { Token, TokenType } from "./token";

export const leftParenToken = (start: number = 0) =>
  new Token(TokenType.LEFT_BRACKET, "(", "(", start, start + 1);
export const rightParenToken = (start: number = 0) =>
  new Token(TokenType.RIGHT_BRACKET, ")", ")", start, start + 1);
export const andToken = (start: number = 0) =>
  new Token(TokenType.AND, "AND", "AND", start, start + 3);
export const eofToken = (start: number) =>
  new Token(TokenType.EOF, "", undefined, start, start);
export const colonToken = (start: number) =>
  new Token(TokenType.COLON, "", undefined, start, start);
export const unquotedStringToken = (str: string, start: number = 0) =>
  new Token(TokenType.STRING, str, str, start, start + str.length - 1);
export const quotedStringToken = (str: string, start: number = 0) =>
  new Token(TokenType.STRING, `"${str}"`, str, start, start + str.length + 1);
export const queryFieldKeyToken = (str: string, start: number = 0) =>
  new Token(
    TokenType.QUERY_FIELD_KEY,
    `+${str}`,
    str,
    start,
    start + str.length
  );
export const queryOutputModifierKeyToken = (str: string, start: number = 0) =>
  new Token(
    TokenType.QUERY_OUTPUT_MODIFIER_KEY,
    `@${str}`,
    str,
    start,
    start + str.length
  );
export const queryValueToken = (str: string, start: number = 0) =>
  new Token(TokenType.QUERY_VALUE, `:${str}`, str, start, start + str.length);

export const queryField = (
  key: string,
  value?: string,
  start: number = 0
): QueryField =>
  createQueryField(
    queryFieldKeyToken(key, start),
    value !== undefined
      ? queryValueToken(value, start + key.length + 1)
      : undefined
  );
