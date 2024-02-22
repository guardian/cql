package cql.lang

trait Query

case class QueryList(
    exprs: List[QueryBinary | QueryField | QueryOutputModifier]
) extends Query
case class QueryBinary(
    left: QueryContent,
    right: Option[(Token, QueryContent)] = None
)
case class QueryContent(content: QueryStr | QueryBinary | QueryGroup)
case class QueryGroup(content: QueryBinary)
case class QueryStr(searchExpr: String) extends Query
case class QueryField(key: Token, value: Option[Token]) extends Query
case class QueryOutputModifier(key: Token, value: Option[Token]) extends Query
