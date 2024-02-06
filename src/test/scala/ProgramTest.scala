package cql

class ProgramTest extends BaseTest {

  describe("a program") {
    val cql = new Cql()
    it("should produce a query string") {
      val str = cql.run("+section:commentisfree")
      str.queryResult shouldBe Some("section=commentisfree")
    }

    it("should combine bare strings and search params") {
      val str = cql.run("marina +section:commentisfree")
      str.queryResult shouldBe Some("q=marina&section=commentisfree")
    }

    it("should combine quoted strings and search params") {
      val str = cql.run("\"marina\" +section:commentisfree")
      str.queryResult shouldBe Some("q=marina&section=commentisfree")
    }

    it("should permit boolean operations") {
      val str = cql.run("\"marina\" AND hyde +section:commentisfree")
      str.queryResult shouldBe Some(
        "q=marina%20AND%20hyde&section=commentisfree"
      )
    }

    it("should permit groups - 1") {
      val str =
        cql.run("\"marina\" AND (hyde OR abramovic) +section:commentisfree")
      str.queryResult shouldBe Some(
        "q=marina%20AND%20(hyde%20OR%20abramovic)&section=commentisfree"
      )
    }

    it("should permit groups - 2") {
      val str = cql.run("(hyde OR abramovic) +section:commentisfree")
      str.queryResult shouldBe Some(
        "q=(hyde%20OR%20abramovic)&section=commentisfree"
      )
    }
  }
}
