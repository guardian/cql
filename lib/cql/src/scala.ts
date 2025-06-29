import * as ts from "typescript";
import fs from "node:fs";

const code = fs.readFileSync("./lang/ast.ts", "utf-8");

// Parse the TypeScript code into an AST
const sourceFile = ts.createSourceFile(
  "example.ts",
  code,
  ts.ScriptTarget.Latest,
);

const getNodesOfKind = (
  node: ts.Node,
  kind: ts.SyntaxKind,
  currentDepth = 0,
  maxDepth = Infinity,
): ts.Node[] => {
  const nodesOfKind: ts.Node[] = [];
  if (currentDepth > maxDepth) {
    return nodesOfKind;
  }
  ts.forEachChild(node, (childNode) => {
    if (childNode.kind === kind) {
      nodesOfKind.push(childNode);
    } else {
      nodesOfKind.push(
        ...getNodesOfKind(childNode, currentDepth + 1, maxDepth),
      );
    }
  });

  return nodesOfKind;
};

// Start traversing the AST from the source file
const classes = getNodesOfKind(sourceFile, ts.SyntaxKind.ClassDeclaration);

const caseClassIDL = classes.map((classNode) => {
  const className = getNodesOfKind(classNode, ts.SyntaxKind.Identifier).map(
    (n) => (n as ts.Identifier).text,
  )[0];
  const classProperties = getNodesOfKind(
    classNode,
    ts.SyntaxKind.PropertyDeclaration,
  ).map((n) => ({
    name: (n as ts.PropertyDeclaration).name.getText(sourceFile),
    optional: !!(n as ts.PropertyDeclaration).questionToken,
  }));

  const constructor = getNodesOfKind(
    classNode,
    ts.SyntaxKind.Constructor,
  )[0] as ts.ConstructorDeclaration;

  const constructorProperties = constructor.parameters
    .filter((p) =>
      p.modifiers?.some((m) => m.kind === ts.SyntaxKind.PublicKeyword),
    )
    .map((p) => ({
      name: p.name.getText(sourceFile),
      optional: !!p.questionToken,
      type: p.type?.getText(sourceFile),
    }));

  return {
    className,
    properties: classProperties,
    publicParamNames: constructorProperties,
  };
});

let output = "";

caseClassIDL.forEach((caseClass) => {
  output += `case class ${caseClass.className} (${caseClass.publicParamNames.map((publicParam) => `${publicParam.name}: ${publicParam.type}`).join(", ")})\n`;
});

console.log(output);
