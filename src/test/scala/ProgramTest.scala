package cql

class ProgramTest extends BaseTest {

  describe("a program") {
    val cql = new Cql()
    it("should block scope") {
      val result = cql.run("""
        var a = "global a";
        var b = "global b";
        var c = "global c";
        {
          var a = "outer a";
          var b = "outer b";
          {
            var c = "inner c";
            print a;
            print b;
            print c;
          }
          print a;
          print b;
          print c;
        }
        print a;
        print b;
        print c;
      """)

      assert(
        result === List(
          "outer a",
          "outer b",
          "inner c",
          "outer a",
          "outer b",
          "global c",
          "global a",
          "global b",
          "global c"
        )
      )
    }

    it("should handle for loops") {
      val result = cql.run("""
        for (var b = 1; b < 3; b = b + 1) print(b);
      """)

      assert(result === List("2.0", "3.0"))
    }

    it("should handle while loops") {
      val result = cql.run("""
        var a = 1;
        while (a <= 3) {
          print(a);
          a = a + 1;
        }
      """)

      assert(result === List("1.0", "2.0", "3.0"))
    }
  }
}
