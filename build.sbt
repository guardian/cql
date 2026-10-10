name := "cql"
organization := "com.gu"
description:= "Query language for the Guardian's Content API"
version := "1.0"

scalacOptions ++= Seq(
  "-deprecation",
  "-encoding", "UTF-8"
)

val javaVersion = 21

initialize := {
  // Ensure previous initializations are run
  val _ = initialize.value

  // Retrieve the JVM's class version and specification version
  val classVersion = sys.props("java.class.version")
  val specVersion = sys.props("java.specification.version")

  assert(specVersion.toDouble >= javaVersion, s"Java ${javaVersion} or above is required to run this project.")
}

val circeVersion = "0.14.4"

lazy val cql = project.in(file("."))
  .enablePlugins(RiffRaffArtifact)
  .settings(
    scalaVersion := "3.9.0",
    libraryDependencies ++= Seq(
      "io.circe" %% "circe-core" % circeVersion,
      "io.circe" %% "circe-parser" % circeVersion,
      "io.circe" %% "circe-generic" % circeVersion,
      "org.scalatest" %% "scalatest" % "3.2.9" % "test",
      "ch.qos.logback" % "logback-classic" % "1.4.7",
      "com.typesafe.scala-logging" %% "scala-logging" % "3.9.5",
    )
  )
