package cql.lang

import concurrent.ExecutionContext.Implicits.global // Todo: sticking plaster

class CqlTest extends BaseTest {
  describe("a program") {
    val typeaheadHelpers = new TestTypeaheadHelpers()
    val typeahead = new Typeahead(typeaheadHelpers.typeaheadFields, List.empty)

    val cql = new Cql(typeahead)
    it("should produce a query string") {
      cql.run("+section:commentisfree").map { result =>
        result.queryResult shouldBe Some("section=commentisfree")
      }
    }

    it("should combine bare strings and search params") {
      cql.run("marina +section:commentisfree").map { result =>
        result.queryResult shouldBe Some("q=marina&section=commentisfree")
      }
    }

    it("should combine quoted strings and search params") {
      cql.run("\"marina\" +section:commentisfree").map { result =>
        result.queryResult shouldBe Some("q=marina&section=commentisfree")
      }
    }

    it("should permit boolean operations") {
      cql.run("\"marina\" AND hyde +section:commentisfree").map { result =>
        result.queryResult shouldBe Some(
          "q=marina%20AND%20hyde&section=commentisfree"
        )
      }
    }

    it("should permit groups - 1") {
      cql.run("\"marina\" AND (hyde OR abramovic) +section:commentisfree").map {
        result =>
          result.queryResult shouldBe Some(
            "q=marina%20AND%20(hyde%20OR%20abramovic)&section=commentisfree"
          )
      }
    }

    it("should permit groups - 2") {
      cql.run("(hyde OR abramovic) +section:commentisfree").map { result =>
        result.queryResult shouldBe Some(
          "q=(hyde%20OR%20abramovic)&section=commentisfree"
        )
      }
    }
  }
}
