import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { CqlLambda } from "./cql-lambda";

describe("The CqlLambda stack", () => {
  it("matches the snapshot", () => {
    const app = new App();
    const stack = new CqlLambda(app, "CqlLambda", { stack: "cql", stage: "TEST" });
    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();
  });
});
