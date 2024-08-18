import { Token } from "../Query";
import { createQueryArray, createQueryBinary, createQueryContent, createQueryGroup, createQueryStr, QueryArray, QueryBinary, QueryContent, QueryField, QueryGroup, QueryStr } from "./ast";
import { TokenType } from "./token";

class ParseError extends Error {
  constructor(
  public position: number, public message: string) {
    super(message);
  }
}

class Parser {
  private current: number = 0;
  private skipTypes = [];

  constructor(private tokens: Token[]) {}

  public parse(): QueryArray {
    return this.queryArray();
  }

  // program    -> statement* EOF
  private queryArray() {
    const queries: (QueryBinary | QueryField)[] = []
    while (this.peek().tokenType !== TokenType.EOF) {
      queries.push(this.query())
    }
   return createQueryArray(queries)
  }

  private startOfQueryField = [TokenType.QUERY_FIELD_KEY, TokenType.PLUS]
  private startOfQueryOutputModifier =
    [TokenType.QUERY_OUTPUT_MODIFIER_KEY, TokenType.AT]
  private startOfQueryValue =
    [TokenType.QUERY_VALUE, TokenType.COLON]

  private query(): QueryBinary | QueryField {
    if (this.startOfQueryField.includes(this.peek().tokenType)) {
      return this.queryField();
    } else if (this.startOfQueryValue.includes(this.peek().tokenType))
      throw new ParseError(
        this.peek().start,
        "I found an unexpected ':'. Did you numberend to search for a tag, section or similar, e.g. tag:news? If you would like to add a search phrase containing a ':' character, please surround it in double quotes."
      )
    else return this.queryBinary()

  private queryBinary(): QueryBinary {
    const left = this.queryContent()

    switch(this.peek().tokenType) {
      case TokenType.AND: {
        const andToken = this.consume(TokenType.AND)
        this.guardAgainstQueryField("after 'AND'.")
        if (this.isAtEnd()) {
          throw this.error(
            "There must be a query following 'AND', e.g. this AND that."
          )
        }
        return createQueryBinary(left, [andToken, this.queryBinary()])
      }
      case TokenType.OR: {
        const orToken = this.consume(TokenType.OR)
        this.guardAgainstQueryField("after 'OR'.")
        if (this.isAtEnd()) {
          throw this.error(
            "There must be a query following 'OR', e.g. this OR that."
          )
        }
        return createQueryBinary(left, [(orToken, this.queryBinary())]);
      }
      default: {
        return createQueryBinary(left)
      }
    }
  }

  private queryContent(): QueryContent {
    switch(this.peek().tokenType) {
      case TokenType.LEFT_BRACKET:
        return createQueryContent(this.queryGroup());
      case TokenType.STRING:
        return createQueryContent(this.queryStr());

      default: {
        if ([TokenType.AND, TokenType.OR].includes(token)) {
          throw this.error(
            `An ${token.tostring()} keyword must have a search term before and after it, e.g. this ${token.tostring} that.`
          )
        } else {
          throw this.error(`I didn't expect what I found after '${this.previous().lexeme}'`)
        }
      }
    }
  }

  private queryGroup(): QueryGroup {
    consume(TokenType.LEFT_BRACKET, "Groups should start with a left bracket")

    if (this.isAtEnd() || this.peek().tokenType == TokenType.RIGHT_BRACKET) {
      throw this.error(
        "Groups must contain some content. Put a search term between the brackets!"
      )
    }

    this.guardAgainstQueryField(
      "within a group. Try putting this query outside of the brackets!"
    )

    const binary = this.queryBinary()
    consume(TokenType.RIGHT_BRACKET, "Groups must end with a right bracket.")

    return createQueryGroup(binary)
  }

  private queryStr(): QueryStr {
    const token = consume(TokenType.STRING, "Expected a string")
    return createQueryStr(token.literal.getOrElse(""))
  }

  private queryField(): QueryField {
    const key = try {
      consume(TokenType.QUERY_FIELD_KEY, "Expected a search key, e.g. +tag")
    } catcH
      consume(TokenType.PLUS, "Expected at least a +")
    }.get

    const value = Try {
      consume(TokenType.QUERY_VALUE, s"Expected a search value, e.g. +tag:news")
    }.recoverWith { _ =>
      Try {
        consume(TokenType.COLON, "Expected at least a :")
      }
    }.toOption

    QueryField(key, value)
  }

  private  queryOutputModifier: QueryOutputModifier() =
    const key = Try {
      consume(
        TokenType.QUERY_OUTPUT_MODIFIER_KEY,
        "Expected a query modifier key, e.g. @show-fields"
      )
    }.recover { _ =>
      consume(TokenType.AT, "Expected at least an @")
    }.get

    const value = Try {
      consume(
        TokenType.QUERY_VALUE,
        "Expected a value for the query modifier, e.g. @show-fields:all"
      )
    }.recoverWith { _ =>
      Try {
        consume(TokenType.COLON, "Expected at least a :")
      }
    }.toOption

    QueryOutputModifier(key, value)

  private  matchTokens(tokens: TokenType*)() =
    tokens.exists(token =>
      if (check(token)) {
        advance()
        true
      } else false
    )

  /** Throw a sensible parse error when a query field or output modifier is
    * found in the wrong place.
    */
  private  guardAgainstQueryField(errorLocation: string)() =
    peek().tokenType match {
      case TokenType.AT =>
        throw error(
          s"You cannot put output modifiers (e.g. @show-fields:all) ${errorLocation}"
        )
      case TokenType.PLUS =>
        throw error(
          s"You cannot put queries for tags, sections etc. ${errorLocation}"
        )
      case TokenType.QUERY_FIELD_KEY =>
        const queryFieldNode = queryField
        throw error(
          s"You cannot query for ${queryFieldNode.key.literal.getOrElse("")}s ${errorLocation}"
        )
      case TokenType.QUERY_OUTPUT_MODIFIER_KEY =>
        const queryFieldNode = queryOutputModifier
        throw error(
          s"You cannot add an output modifier for ${queryFieldNode.key.literal
              .getOrElse("")}s ${errorLocation}"
        )
      case _ => ()
    }

  private  check(tokenType: TokenType)() =
    if (isAtEnd) false else peek().tokenType == tokenType

  private  isAtEnd = peek().tokenType == E()OF

  private  peek() = tokens(curren()t)

  private  advance()() =
    if (!isAtEnd) current = current + 1
    previous()

  private  consume(tokenType: TokenType, message: string = "") =() {
    if (check(tokenType)) advance()
    else throw error(message)
  }

  private  previous() = tokens(current - ()1)

  private  error(message: string)() =
    new ParseError(peek().start, message)
