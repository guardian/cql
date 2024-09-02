import { Token } from "./token";
import {
  createQueryArray,
  createQueryBinary,
  createQueryContent,
  createQueryField,
  createQueryGroup,
  createQueryStr,
  QueryArray,
  QueryBinary,
  QueryContent,
  QueryField,
  QueryGroup,
  QueryStr,
} from "./ast";
import { TokenType } from "./token";

class ParseError extends Error {
  constructor(public position: number, public message: string) {
    super(message);
  }
}

export class Parser {
  private current: number = 0;
  private skipTypes = [];

  constructor(private tokens: Token[]) {}

  public parse(): QueryArray {
    return this.queryArray();
  }

  // program    -> statement* EOF
  private queryArray() {
    const queries: (QueryBinary | QueryField)[] = [];
    while (this.peek().tokenType !== TokenType.EOF) {
      queries.push(this.query());
    }
    return createQueryArray(queries);
  }

  private startOfQueryField = [TokenType.QUERY_FIELD_KEY, TokenType.PLUS];
  private startOfQueryOutputModifier = [
    TokenType.QUERY_OUTPUT_MODIFIER_KEY,
    TokenType.AT,
  ];
  private startOfQueryValue = [TokenType.QUERY_VALUE, TokenType.COLON];

  private query(): QueryBinary | QueryField {
    if (this.startOfQueryField.includes(this.peek().tokenType)) {
      return this.queryField();
    } else if (this.startOfQueryValue.includes(this.peek().tokenType))
      throw new ParseError(
        this.peek().start,
        "I found an unexpected ':'. Did you numberend to search for a tag, section or similar, e.g. tag:news? If you would like to add a search phrase containing a ':' character, please surround it in double quotes."
      );
    else return this.queryBinary();
  }

  private queryBinary(): QueryBinary {
    const left = this.queryContent();

    switch (this.peek().tokenType) {
      case TokenType.AND: {
        const andToken = this.consume(TokenType.AND);
        this.guardAgainstQueryField("after 'AND'.");
        if (this.isAtEnd()) {
          throw this.error(
            "There must be a query following 'AND', e.g. this AND that."
          );
        }
        return createQueryBinary(left, [andToken, this.queryBinary()]);
      }
      case TokenType.OR: {
        const orToken = this.consume(TokenType.OR);
        this.guardAgainstQueryField("after 'OR'.");
        if (this.isAtEnd()) {
          throw this.error(
            "There must be a query following 'OR', e.g. this OR that."
          );
        }
        return createQueryBinary(left, [orToken, this.queryBinary()]);
      }
      default: {
        return createQueryBinary(left);
      }
    }
  }

  private queryContent(): QueryContent {
    switch (this.peek().tokenType) {
      case TokenType.LEFT_BRACKET:
        return createQueryContent(this.queryGroup());
      case TokenType.STRING:
        return createQueryContent(this.queryStr());

      default: {
        const token = this.peek().tokenType;
        if ([TokenType.AND, TokenType.OR].includes(token)) {
          throw this.error(
            `An ${token.toString()} keyword must have a search term before and after it, e.g. this ${token.toString()} that.`
          );
        } else {
          throw this.error(
            `I didn't expect what I found after '${this.previous().lexeme}'`
          );
        }
      }
    }
  }

  private queryGroup(): QueryGroup {
    this.consume(
      TokenType.LEFT_BRACKET,
      "Groups should start with a left bracket"
    );

    if (this.isAtEnd() || this.peek().tokenType == TokenType.RIGHT_BRACKET) {
      throw this.error(
        "Groups must contain some content. Put a search term between the brackets!"
      );
    }

    this.guardAgainstQueryField(
      "within a group. Try putting this query outside of the brackets!"
    );

    const binary = this.queryBinary();
    this.consume(
      TokenType.RIGHT_BRACKET,
      "Groups must end with a right bracket."
    );

    return createQueryGroup(binary);
  }

  private queryStr(): QueryStr {
    const token = this.consume(TokenType.STRING, "Expected a string");

    return createQueryStr(token.literal ?? "");
  }

  private queryField(): QueryField {
    const key = this.consume(
      TokenType.QUERY_FIELD_KEY,
      `Expected a search key, e.g. +tag`
    );

    const value = this.consume(
      TokenType.QUERY_VALUE,
      `Expected a search value, e.g. +tag:new`
    );

    return createQueryField(key, value);
  }

  private matchTokens = (tokens: TokenType[]) =>
    tokens.some((token) => {
      if (this.check(token)) {
        this.advance();
        return true;
      } else {
        return false;
      }
    });

  /** Throw a sensible parse error when a query field or output modifier is
   * found in the wrong place.
   */
  private guardAgainstQueryField = (errorLocation: string) => {
    switch (this.peek().tokenType) {
      case TokenType.AT: {
        throw this.error(
          `You cannot put output modifiers (e.g. @show-fields:all) ${errorLocation}`
        );
      }
      case TokenType.PLUS: {
        throw this.error(
          `You cannot put queries for tags, sections etc. ${errorLocation}"`
        );
      }
      case TokenType.QUERY_FIELD_KEY: {
        const queryFieldNode = this.queryField();
        throw this.error(
          `You cannot query for ${queryFieldNode.key.literal} ${errorLocation}`
        );
      }
      default:
        return;
    }
  };

  private check = (tokenType: TokenType) => {
    if (this.isAtEnd()) {
      return false;
    } else {
      return this.peek().tokenType == tokenType;
    }
  };

  private isAtEnd = () => this.peek().tokenType == TokenType.EOF;

  private peek = () => this.tokens[this.current];

  private advance = () => {
    if (!this.isAtEnd()) {
      this.current = this.current + 1;
      return this.tokens[this.current];
    } else {
      return this.previous();
    }
  };

  private consume = (tokenType: TokenType, message: string = ""): Token => {
    if (this.check(tokenType)) {
      return this.advance();
    } else {
      throw this.error(message);
    }
  };

  private previous = () => this.tokens[this.current - 1];

  private error = (message: string) =>
    new ParseError(this.peek().start, message);
}
