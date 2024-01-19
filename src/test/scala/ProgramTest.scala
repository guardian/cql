package cql

class ProgramTest extends BaseTest {

  describe("a program") {
    val cql = new Cql()
    it("should produce a query string") {
      val str = cql.run("+section:commentisfree")
      str shouldBe "&section=commentisfree"
    }

    it("should combine bare strings and search params") {
      val str = cql.run("marina +section:commentisfree")
      str shouldBe "q=marina&&section=commentisfree"
    }

    it("should combine quoted strings and search params") {
      val str = cql.run("\"marina\" +section:commentisfree")
      str shouldBe "q=marina&&section=commentisfree"
    }

    it("should permit groups") {
      val str = cql.run("\"marina\" AND hyde +section:commentisfree")
      str shouldBe "q=marina&&section=commentisfree"
    }
  }
}
