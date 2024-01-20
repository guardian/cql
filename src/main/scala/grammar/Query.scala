package cql.grammar

import cql.Token

trait Query

case class QueryList(exprs: List[QueryBinary | QueryMeta]) extends Query
case class QueryBinary(left: QueryStr, right: Option[(Token, QueryContent)] = None)
case class QueryContent(content: QueryStr | QueryBinary | QueryGroup)
case class QueryGroup(content: QueryBinary)
case class QueryStr(searchExpr: String) extends Query
case class QueryMeta(key: String, value: String) extends Query
