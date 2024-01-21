package cql

import scala.util.CommandLineParser

@main def main(query: String) =
  val cql = new Cql
  cql.run(query)
