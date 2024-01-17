package cql

import java.io.PrintWriter
import java.io.File

object ASTGenerator {
  def main(args: Array[String]) = {
    if (args.headOption.isEmpty || args.size > 1) {
      println("Usage: scala AstGenerator.scala <output_directory>")
      System.exit(1)
    }

    val directory = args(0)
    val defineAst = getAstDefiner(directory)

    defineAst(
      "Query",
      List(
        "QueryList  :: exprs: List[SearchExprQuoted | SearchExprBasic | SearchParamExpr]",
        "SearchExprQuoted :: searchExpr: String",
        "SearchExprBasic  :: searchExpr: String",
        "SearchParam      :: searchParam: SearchParamBasic | SearchParamDate",
        "SearchParamBasic :: key: Token, value: String",
        "SearchParamDate  :: key: Token, value: String",
      )
    )
  }

  def getAstDefiner = (directory: String) =>
    (baseName: String, types: List[String]) => {
      val expressions = types.flatMap { typeExpr =>
        val className = typeExpr.split("::").head.trim
        val fields = typeExpr.split("::")(1).trim
        getTypeDefinition(baseName, className, fields)
      }

      val lines = getFileHeader(baseName, expressions)

      val writer = new PrintWriter(new File(s"$directory/$baseName.scala"))
      lines.foreach(line => writer.print(line + "\n"))
      writer.flush()
      writer.close()
    }

  def getFileHeader(baseName: String, content: List[String]): List[String] =
    List(
      "package cql.grammar",
      "",
      "import cql.Token",
      "",
      s"trait ${baseName}",
      ""
    ) ++ content

  def getTypeDefinition(
      baseName: String,
      className: String,
      fields: String
  ): List[String] = List(
    s"case class ${className}($fields) extends $baseName"
  )
}
