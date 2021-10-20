import { Rule } from "eslint";
import * as ESTree from "estree";
import * as path from "path";

const componentNameRegex = /^[^a-z]/;

function isMemoCallExpression(node: Rule.Node) {
  if (node.type !== "CallExpression") return false;
  if (node.callee.type === "MemberExpression") {
    const {
      callee: { object, property },
    } = node;
    if (
      object.type === "Identifier" &&
      property.type === "Identifier" &&
      object.name === "React" &&
      property.name === "memo"
    ) {
      return true;
    }
  } else if (node.callee.type === "Identifier" && node.callee.name === "memo") {
    return true;
  }

  return false;
}

function checkFunction(
  context: Rule.RuleContext,
  node: (
    | ESTree.ArrowFunctionExpression
    | ESTree.FunctionExpression
    | ESTree.FunctionDeclaration
  ) &
    Rule.NodeParentExtension
) {
  let currentNode = node.parent;
  while (currentNode.type === "CallExpression") {
    if (isMemoCallExpression(currentNode)) {
      return;
    }

    currentNode = currentNode.parent;
  }

  if (currentNode.type === "VariableDeclarator") {
    const { id } = currentNode;
    if (id.type === "Identifier") {
      if (componentNameRegex.test(id.name)) {
        context.report({ node, messageId: "memo-required", fix: (fixer): Rule.Fix => {
          const parent = node.parent
          let scope
          if (parent.type === 'VariableDeclarator') {
            scope = node
          } else {
            scope = parent
          }
          const sourceCode = context.getSourceCode();
// FIX THIS FOR FAILING SPEC
          const text = sourceCode.getText(scope);
          let fixedCode = `memo(${sourceCode.getText(scope)})`
          if (text.startsWith('useRef(function')) {
            fixedCode = `useRef(${sourceCode.getText(scope).replace('useRef', 'memo')})`
          }
          // @ts-ignore
          return [
            fixer.insertTextBefore(parent.parent.parent, 'import { memo } from \'react\'\n\n'),
            fixer.replaceText(scope, fixedCode),
          ]
        } });
      }
    }
  } else if (
    node.type === "FunctionDeclaration" &&
    currentNode.type === "Program"
  ) {
    if (node.id !== null && componentNameRegex.test(node.id.name)) {
      context.report({ node, messageId: "memo-required", fix: (fixer): Rule.Fix => {
        // const parent = node?.parent
        let scope = node

        const sourceCode = context.getSourceCode();
        let fixedCode = `memo(${sourceCode.getText(scope)})`
        // @ts-ignore
        return [
          fixer.insertTextBefore(node, 'import { memo } from \'react\'\n\n'),
          fixer.replaceText(node, fixedCode),
        ]
      } });
    } else {
      if (context.getFilename() === "<input>") return;
      const filename = path.basename(context.getFilename());
      if (componentNameRegex.test(filename)) {
        context.report({ node, messageId: "memo-required" });
      }
    }
  }
}

const rule: Rule.RuleModule = {
  meta: {
    fixable: 'code',
    messages: {
      "memo-required": "Component definition not wrapped in React.memo()",
    },
  },
  create: (context) => ({
    ArrowFunctionExpression(node) {
      checkFunction(context, node);
    },
    FunctionDeclaration(node) {
      checkFunction(context, node);
    },
    FunctionExpression(node) {
      checkFunction(context, node);
    },
  }),
};

export default rule;