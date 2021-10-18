import { Rule } from "eslint";
import * as ESTree from "estree";
import { TSESTree } from "@typescript-eslint/types";
import {
  getExpressionMemoStatus,
  isComplexComponent,
  MemoStatus,
} from "./common";

const hookNameRegex = /^use[A-Z0-9].*$/;

function isHook(node: TSESTree.Node) {
  if (node.type === "Identifier") {
    return hookNameRegex.test(node.name);
  } else if (
    node.type === "MemberExpression" &&
    !node.computed &&
    isHook(node.property)
  ) {
    const obj = node.object;
    return obj.type === "Identifier" && obj.name === "React";
  } else {
    return false;
  }
}

const messages = {
  "object-usememo-props":
    "Object literal should be wrapped in React.useMemo() when used as a prop",
  "object-usememo-deps":
    "Object literal should be wrapped in React.useMemo() when used as a hook dependency",
  "array-usememo-props":
    "Array literal should be wrapped in React.useMemo() when used as a prop",
  "array-usememo-deps":
    "Array literal should be wrapped in React.useMemo() when used as a hook dependency",
  "instance-usememo-props":
    "Object instantiation should be wrapped in React.useMemo() when used as a prop",
  "instance-usememo-deps":
    "Object instantiation should be wrapped in React.useMemo() when used as a hook dependency",
  "jsx-usememo-props":
    "JSX should be wrapped in React.useMemo() when used as a prop",
  "jsx-usememo-deps":
    "JSX should be wrapped in React.useMemo() when used as a hook dependency",
  "function-usecallback-props":
    "Function definition should be wrapped in React.useCallback() when used as a prop",
  "function-usecallback-deps":
    "Function definition should be wrapped in React.useCallback() when used as a hook dependency",
  "unknown-usememo-props":
    "Unknown value may need to be wrapped in React.useMemo() when used as a prop",
  "unknown-usememo-deps":
    "Unknown value may need to be wrapped in React.useMemo() when used as a hook dependency",
  "usememo-const":
    "useMemo/useCallback return value should be assigned to a const to prevent reassignment",
};

const rule: Rule.RuleModule = {
  meta: {
    fixable: 'code',
    messages,
    schema: [
      {
        type: "object",
        properties: { strict: { type: "boolean" } },
        additionalProperties: false,
      },
    ],
  },
  create: (context) => {
    function report(node: Rule.Node, messageId: keyof typeof messages) {
      context.report({ node, messageId: messageId as string });
    }

    return {
      JSXAttribute: (node: ESTree.Node & Rule.NodeParentExtension) => {
        const { parent, value } = (node as unknown) as TSESTree.JSXAttribute &
          Rule.NodeParentExtension;
        if (value === null) return;
        if (!isComplexComponent(parent)) return;
        if (value.type === "JSXExpressionContainer") {
          const { expression } = value;
          if (expression?.type !== "JSXEmptyExpression") {
            switch (getExpressionMemoStatus(context, expression)) {
              case MemoStatus.UnmemoizedObject:
                // @ts-ignore
                context.report({ node, messageId: "object-usememo-props", fix: (fixer): Rule.Fix => {
                  const sourceCode = context.getSourceCode();
                  // @ts-ignore
                  const definition = context.getScope().references.filter((reference) => reference.writeExpr ? reference.writeExpr.properties : null)?.[0]?.writeExpr.parent
                  // console.warn(definition)
                  const [name, value] = sourceCode.getText(definition).split('=')
                  let fixedCode = ''
                  if(name && value) {
                    fixedCode = `${name.trim()} = useMemo(() => (${value.trim()}), [])`
                  }

                  // return fixer.replaceText(scope, fixedCode);
                  if(definition) {
                    return fixer.replaceText(definition, fixedCode)
                  } else {
                    console.warn(context.getScope().references)
                  }
                } });
                break;
              case MemoStatus.UnmemoizedArray:
                // @ts-ignore
                context.report({ node, messageId: "array-usememo-props", fix: (fixer): Rule.Fix => {
                  const sourceCode = context.getSourceCode();
                  // @ts-ignore
                  const definition = context.getScope().references.filter((reference) => reference.writeExpr ? reference.writeExpr : null)?.[0]?.writeExpr.parent
                  // console.warn(definition)
                  const [name, value] = sourceCode.getText(definition).split('=')
                  let fixedCode = ''
                  if(name && value) {
                    fixedCode = `${name.trim()} = useMemo(() => ${value.trim()}, [])`
                  }

                  // return fixer.replaceText(scope, fixedCode);
                  if(definition) {
                    return fixer.replaceText(definition, fixedCode)
                  } else {
                    // console.warn(context.getScope().references)
                  }
                } });
                break;
              case MemoStatus.UnmemoizedNew:
                // @ts-ignore
                context.report({ node, messageId: "instance-usememo-props", fix: (fixer): Rule.Fix => {
                  const sourceCode = context.getSourceCode();
                  // @ts-ignore
                  const definition = context.getScope().references.filter((reference) => reference.writeExpr ? reference.writeExpr : null)?.[0]?.writeExpr.parent
                  // console.warn(definition)
                  const [name, value] = sourceCode.getText(definition).split('=')
                  let fixedCode = ''
                  if(name && value) {
                    fixedCode = `${name.trim()} = useMemo(() => ${value.trim()}, [])`
                  }

                  // return fixer.replaceText(scope, fixedCode);
                  if(definition) {
                    return fixer.replaceText(definition, fixedCode)
                  } else {
                    // @ts-ignore
                    // console.warn(context.getScope().references.filter((reference) => reference.writeExpr ? reference.writeExpr : null)?.[0]?.writeExpr.parent)
                    // console.warn(context.getScope().references)
                  }
                } });
                break;
              case MemoStatus.UnmemoizedFunction:
                report(node, "function-usecallback-props");
                break;
              case MemoStatus.UnmemoizedFunctionCall:
              case MemoStatus.UnmemoizedOther:
                if (context.options?.[0]?.strict) {
                  report(node, "unknown-usememo-props");
                }
                break;
              case MemoStatus.UnmemoizedJSX:
                report(node, "jsx-usememo-props");
                break;
            }
          }
        }
      },

      CallExpression: (node) => {
        const { callee } = (node as unknown) as TSESTree.CallExpression &
          Rule.NodeParentExtension;
        if (!isHook(callee)) return;
        const {
          arguments: [, dependencies],
        } = (node as unknown) as TSESTree.CallExpression &
          Rule.NodeParentExtension;
        if (
          dependencies !== undefined &&
          dependencies.type === "ArrayExpression"
        ) {
          for (const dep of dependencies.elements) {
            if (dep !== null && dep.type === "Identifier") {
              switch (getExpressionMemoStatus(context, dep)) {
                case MemoStatus.UnmemoizedObject:
                  report(node, "object-usememo-deps");
                  break;
                case MemoStatus.UnmemoizedArray:
                  report(node, "array-usememo-deps");
                  break;
                case MemoStatus.UnmemoizedNew:
                  report(node, "instance-usememo-deps");
                  break;
                case MemoStatus.UnmemoizedFunction:
                  report(node, "function-usecallback-deps");
                  break;
                case MemoStatus.UnmemoizedFunctionCall:
                case MemoStatus.UnmemoizedOther:
                  if (context.options?.[0]?.strict) {
                    report(node, "unknown-usememo-deps");
                  }
                  break;
                case MemoStatus.UnmemoizedJSX:
                  report(node, "jsx-usememo-deps");
                  break;
              }
            }
          }
        }
      },
    };
  },
};

export default rule;
