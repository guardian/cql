package cql

import scala.util.CommandLineParser

@main def main(args: String*) =
  val cql = new Cql
  println(args)
  args.toList match
    case head::Nil =>
      cql.runFile(head)
    case Nil =>
      cql.runPrompt()
    case _ =>
      println("Usage: scql [script]")
      sys.exit(64)
