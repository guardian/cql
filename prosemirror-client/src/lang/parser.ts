import { Token } from "./token";
import {
  createQuery,
  createQueryBinary,
  createQueryContent,
  createQueryField,
  createQueryGroup,
  createQueryStr,
  Query,
  QueryBinary,
  QueryContent,
  QueryField,
  QueryGroup,
  QueryStr,
} from "./ast";
import { TokenType } from "./token";
import { either, err, ok, Result } from "../utils/result";

class ParseError extends Error {
  constructor(
    public position: number,
    public message: string
  ) {
    super(message);
  }
}

export class Parser {
  private current: number = 0;

  constructor(private tokens: Token[]) {}

  public parse(): Result<ParseError, Query> {
    try {
      return ok(this.query());
    } catch (e) {
      if (e instanceof ParseError) {
        return err(e);
      }
      throw e;
    }
  }

  private query(): Query {
    const content =
      this.peek().tokenType === TokenType.EOF ? undefined : this.queryBinary();

    return createQuery(content);
  }

  private queryBinary(isNested: boolean = false): QueryBinary {
    if (this.peek().tokenType === TokenType.CHIP_VALUE)
      throw new ParseError(
        this.peek().start,
        "I found an unexpected ':'. Did you numberend to search for a tag, section or similar, e.g. tag:news? If you would like to add a search phrase containing a ':' character, please surround it in double quotes."
      );

    const left = this.queryContent();

    if (isNested) {
      this.guardAgainstQueryField("within a group");
    }

    switch (this.peek().tokenType) {
      case TokenType.AND: {
        const andToken = this.consume(TokenType.AND);
        this.guardAgainstQueryField("after 'AND'.");
        if (this.isAtEnd()) {
          throw this.error(
            "There must be a query following 'AND', e.g. this AND that."
          );
        }
        return createQueryBinary(left, [andToken, this.queryBinary(isNested)]);
      }
      case TokenType.OR: {
        const orToken = this.consume(TokenType.OR);
        this.guardAgainstQueryField("after 'OR'.");
        if (this.isAtEnd()) {
          throw this.error(
            "There must be a query following 'OR', e.g. this OR that."
          );
        }
        return createQueryBinary(left, [orToken, this.queryBinary(isNested)]);
      }
      case TokenType.RIGHT_BRACKET:
      case TokenType.EOF: {
        return createQueryBinary(left);
      }
      default: {
        return createQueryBinary(left, [
          new Token(TokenType.OR, "", undefined, 0, 0),
          this.queryBinary(isNested),
        ]);
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
        const { tokenType } = this.peek();
        if ([TokenType.AND, TokenType.OR].some((i) => i === tokenType)) {
          throw this.error(
            `An ${tokenType.toString()} keyword must have a search term before and after it, e.g. this ${tokenType.toString()} that.`
          );
        } else if (this.peek().tokenType === TokenType.CHIP_KEY) {
          return createQueryContent(this.queryField());
        } else {
          throw this.error(
            `I didn't expect what I found after '${this.previous()?.lexeme}'`
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

    if (this.isAtEnd() || this.peek().tokenType === TokenType.RIGHT_BRACKET) {
      throw this.error(
        "Groups can't be empty. Put a search term between the brackets!"
      );
    }

    this.guardAgainstQueryField(
      "within a group. Try putting this search term outside of the brackets!"
    );

    const binary = this.queryBinary(true);
    this.consume(
      TokenType.RIGHT_BRACKET,
      "Groups must end with a right bracket."
    );

    return createQueryGroup(binary);
  }

  private queryStr(): QueryStr {
    const token = this.consume(TokenType.STRING, "Expected a string");

    return createQueryStr(token);
  }

  private queryField(): QueryField {
    const key = this.consume(
      TokenType.CHIP_KEY,
      "Expected a search key, e.g. +tag"
    );

    const maybeValue = this.safeConsume(
      TokenType.CHIP_VALUE,
      "Expected a search value, e.g. +tag:new"
    );

    return either(maybeValue)(
      () => createQueryField(key, undefined),
      (value: Token) => createQueryField(key, value)
    );
  }

  /**
   * Throw a sensible parse error when a query field or output modifier is
   * found in the wrong place.
   */
  private guardAgainstQueryField = (errorLocation: string) => {
    switch (this.peek().tokenType) {
      case TokenType.CHIP_KEY: {
        const queryFieldNode = this.queryField();
        throw this.error(
          `You cannot query for the field “${queryFieldNode.key.literal}” ${errorLocation}`
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
      const currentToken = this.tokens[this.current];
      this.current = this.current + 1;
      return currentToken;
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

  private safeConsume = (
    tokenType: TokenType,
    message: string = ""
  ): Result<ParseError, Token> => {
    try {
      return ok(this.consume(tokenType, message));
    } catch (e) {
      if (e instanceof ParseError) {
        return err(e);
      }
      throw e;
    }
  };

  private previous = () => this.tokens[this.current - 1];

  private error = (message: string) =>
    new ParseError(this.peek().start, message);
}
