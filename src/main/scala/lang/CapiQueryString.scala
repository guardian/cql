package cql.lang

import CqlUtils.{encodeURI, getCqlFieldsFromCqlBinary}

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import scala.util.Try

case class CapiCqlStringError(message: String)

object CapiCqlString:
  private val dateFields = Set("from-date", "to-date")
  private val relativeDateR =
    """(?<polarity>[-+])(?<quantity>\d+)(?<unit>[dmyw])""".r

  def build(query: CqlQuery): Either[CapiCqlStringError, String] =
    query.content match
      case None => Right("")
      case Some(content) =>
        val (errors, fieldParams) =
          getCqlFieldsFromCqlBinary(content).partitionMap(fieldToParam)

        errors.headOption.toLeft {
          val searchStr = strFromBinary(content).trim
          val queryParam =
            Option.when(searchStr.nonEmpty)(s"q=${encodeURI(searchStr)}")
          (queryParam.toList ++ fieldParams).mkString("&")
        }

  private def fieldToParam(field: CqlField): Either[CapiCqlStringError, String] =
    val key = field.key.literal.getOrElse("")
    for
      literal <- field.value
        .flatMap(_.literal)
        .filter(_.nonEmpty)
        .toRight(
          CapiCqlStringError(
            s"The field '$key' needs a value after it (e.g. '$key:tone/news')"
          )
        )
      value <-
        if dateFields.contains(key) then parseDateValue(key, literal)
        else Right(literal)
    yield s"$key=$value"

  private def parseDateValue(
      key: String,
      value: String
  ): Either[CapiCqlStringError, String] =
    relativeDateR.findFirstMatchIn(value) match
      case None => Right(value)
      case Some(matched) =>
        // Quantities can overflow, and dates can fall outside LocalDate's range
        Try {
          val quantity = matched.group("quantity").toLong
          val signed =
            if matched.group("polarity") == "+" then quantity else -quantity
          val now = LocalDate.now()
          val date = matched.group("unit") match
            case "y" => now.plusYears(signed)
            case "m" => now.plusMonths(signed)
            case "w" => now.plusWeeks(signed)
            case _   => now.plusDays(signed)
          date.format(DateTimeFormatter.ISO_LOCAL_DATE)
        }.toEither.left.map(_ =>
          CapiCqlStringError(s"'$value' is not a valid date for '$key'")
        )

  private def strFromUnary(unary: CqlUnary): String =
    val prefix = if unary.polarity == Polarity.NEGATIVE then "-" else ""
    prefix + strFromPrimary(unary.primary)

  private def strFromPrimary(primary: CqlPrimary): String =
    primary match
      case str: CqlStr     => str.searchExpr
      case group: CqlGroup => s"(${strFromExpr(group.content).trim})"
      // Fields are accumulated at the top of the tree
      case _: CqlField => ""

  private def strFromExpr(expr: CqlExpr): String =
    expr match
      case unary: CqlUnary   => strFromUnary(unary)
      case binary: CqlBinary => strFromBinary(binary)

  private def strFromBinary(binary: CqlBinary): String =
    val leftStr = strFromExpr(binary.left)
    binary.right match
      case Some(CqlBinaryRight(operator, expr)) =>
        val rightStr = strFromExpr(expr)
        if rightStr.isEmpty then leftStr
        else
          val operatorStr =
            if leftStr.nonEmpty then operator.tokenType.toString else ""
          s"$leftStr $operatorStr ${rightStr.trim} "
      case None => leftStr

