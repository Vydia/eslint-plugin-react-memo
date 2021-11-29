import { Rule } from "eslint";
import * as ESTree from "estree";
import { TSESTree } from "@typescript-eslint/types";
import { Node } from "@typescript-eslint/types/dist/ast-spec"
import { isArrowFn } from "./utils";

import {
  getExpressionMemoStatus,
  isComplexComponent,
  MemoStatus,
} from "./common";
import { fromPairs } from "lodash";
import { isConstructorDeclaration } from "typescript";

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
    let alreadyFixedJsx: boolean = false
    function report(node: Rule.Node, messageId: keyof typeof messages) {
      context.report({ node, messageId: messageId as string });
    }

    const useMemoFix = (fixer: Rule.RuleFixer, implicitReturn: boolean = true): Rule.Fix | null => {
      const sourceCode = context.getSourceCode();
      const references = context.getScope()?.references
      const filteredRefs = references?.filter((reference) => reference?.writeExpr)
      // @ts-ignore
      const definition = filteredRefs?.[0]?.writeExpr?.parent
      if (!definition) return null
      const [name, value] = sourceCode.getText(definition).split(/=(.+)/)
      const fixedCode = `${name.trim()} = useMemo(() => ${implicitReturn ? value.trim() : `(${value.trim()})`}, [])`
      return fixer.replaceText(definition, fixedCode)
    }

    const useMemoJsxFix = (fixer: Rule.RuleFixer, node: Rule.Node,  implicitReturn: boolean = true): Rule.Fix | null => {
      // console.log(fixer)
      // console.log(context.options)
      if (alreadyFixedJsx) {
        alreadyFixedJsx = false
        return null
      }
      const sourceCode = context.getSourceCode();
      const references = context.getScope()?.references
      // const returnStatement = references?[0]
      // @ts-ignore
      const block = context.getScope().block.body.body
      // console.log(context.getScope().block)
      if (!block) return null
      const returnLine = block[block.length - 1].loc.start.line
      const lineAboveReturn = sourceCode.getIndexFromLoc({ line: returnLine, column: 0 })
// @ts-ignore
      const filteredRefs = references?.filter((reference) => reference?.identifier.type === 'Identifier')
// @ts-ignore
      // console.log(filteredRefs)
      // @ts-ignore
      // console.log(filteredRefs[0].identifier.parent.parent.parent.parent.parent)
      // @ts-ignore
      // const parentAttributes = filteredRefs[0].identifier.parent.attributes
      // @ts-ignore
      // const filteredJsxExp = parentAttributes.filter((ref) => ref.value.type === 'JSXExpressionContainer')
      // @ts-ignore
      // console.log(filteredJsxExp)
      // console.log(sourceCode.getText(references[1].identifier))
      // console.log(sourceCode.getText(filteredRefs[0].identifier.parent).split('.'))
      // console.warn(node)
      // console.warn('node' ,sourceCode.getText(node))
      // @ts-ignore
      const [t, nameOfConst] = sourceCode.getText(filteredRefs[0].identifier.parent).split('.')
      // @ts-ignore
      const nodeText = sourceCode.getText(node)
      // const [name, value] = sourceCode.getText(node).split(/[^\w*=](.*)/)
      // console.log(name)
      const value = nodeText.replace(/^\w*=/, '')
      // @ts-ignore
      const name = nodeText.match(/^\w*/)[0]
      console.log(name)
      // @ts-ignore
      const nameOfConst = `${name}${node.start}`
      console.log(nameOfConst)
      // const definition = filteredRefs?.[0]?.identifier.parent
      // if (!definition) return null
      // const [name, value] = sourceCode.getText(definition).split(/=(.+)/)
      // const fixedCode = `${name.trim()} = useMemo(() => ${implicitReturn ? value.trim() : `(${value.trim()})`}, [])`
      const replacedParens = value.replace(/^{/, '(').replace(/\}$/, ')')
      const toInsert = `const ${nameOfConst} = useMemo(() => ${replacedParens}, [])\n`
      // console.log(filteredRefs[0].identifier.parent.parent.parent.parent.parent)
      // fixer.insertTextAfterRange([lineAboveReturn, lineAboveReturn], toInsert)
      // fixer.replaceText(filteredRefs[0].identifier.parent.parent.parent.parent.parent, `${name}={${nameOfConst}}`)
      // return null
      // console.log(toInsert)
      // alreadyFixedJsx = true
// @ts-ignore
      // const identifier = filteredRefs[0].identifier.parent.parent.parent.parent.parent
      // console.log(identifier)
      // @ts-ignore
      return [
        fixer.insertTextAfterRange([lineAboveReturn, lineAboveReturn], toInsert),
        fixer.replaceText(node, `${name}={${nameOfConst}}`),
      ].filter(i => i)
    }

    const useCallbackFix = (fixer: Rule.RuleFixer): Rule.Fix | null => {
      let fixedCode = ''
      const sourceCode = context.getSourceCode();
      const references = context.getScope()?.references
      const filteredRefs = references?.filter((reference) => reference?.writeExpr)
      // @ts-ignore
      const definition = filteredRefs?.[0]?.writeExpr?.parent
      if (!definition) return null
      const [name, value] = sourceCode.getText(definition).split(/=(.+)/)
      if(isArrowFn(value)){
        fixedCode = `${name.trim()} = useCallback(${value.trim()}, [])`
      } else {
        fixedCode = `${name.trim()} = useCallback(${value.replace(`function ${name.trim()}`, 'function').trim()}, [])`
      }
      return fixer.replaceText(definition, fixedCode)
    }

    return {
      JSXAttribute: (node: Rule.Node & Rule.NodeParentExtension) => {
        const { parent, value } = (node as unknown) as TSESTree.JSXAttribute &
          Rule.NodeParentExtension;
        if (value === null) return;
        if (!isComplexComponent(parent)) return;
        if (value.type === "JSXExpressionContainer") {
          const { expression } = value;
          if (expression?.type !== "JSXEmptyExpression") {
            switch (getExpressionMemoStatus(context, expression)) {
              // case MemoStatus.UnmemoizedObject:
              //   context.report({ node, messageId: "object-usememo-props", fix: (fixer) => useMemoFix(fixer, false) });
              //   break;
              // case MemoStatus.UnmemoizedArray:
              //   context.report({ node, messageId: "array-usememo-props", fix: (fixer) => useMemoFix(fixer) });
              //   break;
              // case MemoStatus.UnmemoizedNew:
              //   context.report({ node, messageId: "instance-usememo-props", fix: (fixer) => useMemoFix(fixer) });
              //   break;
              // case MemoStatus.UnmemoizedFunction:
              //   context.report({ node, messageId: "function-usecallback-props", fix: useCallbackFix });
              //   break;
              // case MemoStatus.UnmemoizedFunctionCall:
              // case MemoStatus.UnmemoizedOther:
              //   if (context.options?.[0]?.strict) {
              //     report(node, "unknown-usememo-props");
              //   }
              //   break;
              case MemoStatus.UnmemoizedJSX:
                // console.log('sup', node)
                context.report({ node, messageId: "jsx-usememo-props", fix: (fixer) => useMemoJsxFix(fixer, node) });
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
