package cql.lang

import concurrent.ExecutionContext.Implicits.global
import java.time.LocalDate

class CqlTest extends BaseTest {
  describe("a query") {
    val typeaheadHelpers = new TestTypeaheadHelpers()
    val typeahead = new Typeahead(
      typeaheadHelpers.typeaheadFields,
      typeaheadHelpers.outputModifierResolvers
    )

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

    it("should permit field queries") {
      cql.run("+tag:example").map { result =>
        result.queryResult shouldBe Some("tag=example")
      }
    }

    it("should permit groups - 1") {
      cql.run("\"marina\" (hyde OR abramovic) +section:commentisfree").map {
        result =>
          result.queryResult shouldBe Some(
            "q=marina%20OR%20(hyde%20OR%20abramovic)&section=commentisfree"
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

    it("should provide an error when keys are missing values") {
      cql.run("+tag:").map { result =>
        result.error.map(_.message) shouldBe Some(
          "The field 'tag' needs a value after it (e.g. 'tag:tone/news')"
        )
      }
    }

    describe("dates") {
      def relativeDate(days: Int): String =
        val date = LocalDate.now().plusDays(days.toLong)
        f"${date.getYear}%04d-${date.getMonthValue}%02d-${date.getDayOfMonth}%02d"

      it("should not change absolute dates") {
        cql.run("+from-date:1987-12-01").map { result =>
          result.queryResult shouldBe Some("from-date=1987-12-01")
        }
      }

      it("should parse relative dates into absolute dates — past dates") {
        cql.run("+from-date:-1d").map { result =>
          result.queryResult shouldBe Some(s"from-date=${relativeDate(-1)}")
        }
      }

      it("should parse relative dates into absolute dates — future dates") {
        cql.run("+from-date:+1d").map { result =>
          result.queryResult shouldBe Some(s"from-date=${relativeDate(1)}")
        }
      }
    }
  }
}
