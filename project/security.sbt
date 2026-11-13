dependencyOverrides += "org.apache.commons" % "commons-lang3" % "3.18.0"
dependencyOverrides += "org.apache.ant" % "ant" % "1.10.11"
dependencyOverrides += "org.codehaus.plexus" % "plexus-utils" % "3.6.1"
dependencyOverrides ++= Seq(
  "com.fasterxml.jackson.core" % "jackson-core" % "2.18.11",
  "com.fasterxml.jackson.core" % "jackson-databind" % "2.18.11",
  "com.fasterxml.jackson.core" % "jackson-annotations" % "2.18.11",
  "com.fasterxml.jackson.dataformat" % "jackson-dataformat-cbor" % "2.18.11"
)
