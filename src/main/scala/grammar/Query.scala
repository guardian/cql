package cql.grammar

import cql.Token

trait Query

case class QueryList(exprs: List[SearchExprQuoted | SearchExprBasic | SearchParam]) extends Query
case class SearchExprQuoted(searchExpr: String) extends Query
case class SearchExprBasic(searchExpr: String) extends Query
case class SearchParam(searchParam: SearchParamBasic | SearchParamDate) extends Query
case class SearchParamBasic(key: String, value: String) extends Query
case class SearchParamDate(key: String, value: String) extends Query
