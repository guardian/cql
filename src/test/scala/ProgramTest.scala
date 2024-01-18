package cql

class ProgramTest extends BaseTest {

  describe("a program") {
    val cql = new Cql()
    it("should produce a query string") {
      cql.run("sausages +tag:tone/news +section:commentisfree")
    }
  }
}
