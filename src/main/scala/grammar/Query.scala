package cql.grammar

import cql.Token

trait Query

case class QueryList(exprs: List[SearchStrQuoted | SearchStr | SearchParam]) extends Query
case class SearchStrQuoted(searchExpr: String) extends Query
case class SearchStr(searchExpr: String) extends Query
case class SearchParam(key: String, value: String) extends Query
