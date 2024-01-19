package cql.grammar

import cql.Token

trait Query

case class QueryList(exprs: List[QueryContent | QueryMeta]) extends Query
case class QueryContent(content: QueryQuotedStr | QueryStr | QueryBinary | QueryGroup)
case class QueryBinary(left: QueryContent, operator: Token, right: QueryContent)
case class QueryGroup(content: List[QueryContent])
case class QueryQuotedStr(searchExpr: String) extends Query
case class QueryStr(searchExpr: String) extends Query
case class QueryMeta(key: String, value: String) extends Query
