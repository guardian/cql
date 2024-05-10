import sbtassembly.AssemblyKeys.assembly
import sbtassembly.AssemblyPlugin.autoImport.assemblyJarName
import sbtassembly.MergeStrategy

name := "cql-lambda"

organization := "com.gu"

description:= "Experimental query language for the Guardian's Content API"

version := "1.0"

scalacOptions ++= Seq(
  "-deprecation",
  "-encoding", "UTF-8"
)

val PekkoVersion = "1.0.1"
val PekkoHttpVersion = "1.0.0"
val circeVersion = "0.14.4"

lazy val cql = project.in(file("."))
  .enablePlugins(RiffRaffArtifact)
  .settings(
    scalaVersion := "3.3.1",
    libraryDependencies ++= Seq(
      "org.apache.pekko" %% "pekko-actor-typed" % PekkoVersion,
      "org.apache.pekko" %% "pekko-stream" % PekkoVersion,
      "org.apache.pekko" %% "pekko-http" % PekkoHttpVersion,
      "io.circe" %% "circe-core" % circeVersion,
      "io.circe" %% "circe-parser" % circeVersion,
      "io.circe" %% "circe-generic" % circeVersion,
      "com.github.pjfanning" %% "pekko-http-circe" % "2.3.3",
      "org.scalatest" %% "scalatest" % "3.2.9" % "test",
      "com.gu" % "content-api-client-default_2.13" % "20.0.2",
      "com.amazonaws" % "aws-lambda-java-core" % "1.2.3",
      "com.amazonaws" % "aws-lambda-java-events" % "3.11.4",
      "ch.qos.logback" % "logback-classic" % "1.4.7",
      "com.typesafe.scala-logging" %% "scala-logging" % "3.9.5",
    )
  )

enablePlugins(RiffRaffArtifact)

assemblyJarName := s"cql-lambda.jar"
riffRaffPackageType := assembly.value
riffRaffUploadArtifactBucket := Option("riffraff-artifact")
riffRaffUploadManifestBucket := Option("riffraff-builds")

assemblyMergeStrategy in assembly := {
 case PathList("META-INF", _*) => MergeStrategy.discard
 case _                        => MergeStrategy.first
}
