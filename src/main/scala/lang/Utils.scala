package cql.lang

import java.nio.charset.StandardCharsets

object CqlUtils:
  private val reservedChars = Set(':', '(', ')', '"')

  def hasWhitespace(char: Char): Boolean = char.isWhitespace

  def hasReservedChar(char: Char): Boolean = reservedChars.contains(char)

  def hasReservedChar(str: String): Boolean = str.exists(reservedChars.contains)

  private val escapedCharR = """\\([:()"])""".r

  def unescapeQuotes(str: String): String =
    escapedCharR.replaceAllIn(str, m => java.util.regex.Matcher.quoteReplacement(m.group(1)))

  private val uriSafeChars: Set[Char] =
    (('A' to 'Z') ++ ('a' to 'z') ++ ('0' to '9')).toSet ++
      ";,/?:@&=+$-_.!~*'()#".toSet

  /** Percent-encode a string as JavaScript's `encodeURI` would: unreserved and
    * reserved URI characters are preserved, everything else (e.g. spaces) is
    * percent-encoded.
    */
  def encodeURI(str: String): String =
    str.flatMap { char =>
      if uriSafeChars.contains(char) then char.toString
      else
        char.toString
          .getBytes(StandardCharsets.UTF_8)
          .map(byte => "%%%02X".format(byte & 0xff))
          .mkString
    }

  def getCqlFieldsFromCqlBinary(binary: CqlBinary): List[CqlField] =
    getCqlFieldsFromExpr(binary.left) ++
      binary.right.toList.flatMap(right => getCqlFieldsFromExpr(right.expr))

  private def getCqlFieldsFromExpr(expr: CqlExpr): List[CqlField] =
    expr match
      case binary: CqlBinary => getCqlFieldsFromCqlBinary(binary)
      case unary: CqlUnary =>
        unary.primary match
          case field: CqlField => List(field)
          case group: CqlGroup => getCqlFieldsFromExpr(group.content)
          case _: CqlStr       => Nil
