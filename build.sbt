val PekkoVersion = "1.0.1"
val PekkoHttpVersion = "1.0.0"
val circeVersion = "0.14.4"

lazy val cql = project.in(file("."))
  .settings(
    scalaVersion := "3.3.1",
    libraryDependencies ++= Seq(
      "org.scalactic" %% "scalactic" % "3.2.9",
      "org.apache.pekko" %% "pekko-actor-typed" % PekkoVersion,
      "org.apache.pekko" %% "pekko-stream" % PekkoVersion,
      "org.apache.pekko" %% "pekko-http" % PekkoHttpVersion,
      "io.circe" %% "circe-core" % circeVersion,
      "io.circe" %% "circe-parser" % circeVersion,
      "io.circe" %% "circe-generic" % circeVersion,
      "com.github.pjfanning" %% "pekko-http-circe" % "2.3.3",
      "org.scalatest" %% "scalatest" % "3.2.9" % "test"
    )
  )

