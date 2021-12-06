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

type VarNames = {
  [base: string]: number,
}

const hookNameRegex = /^use[A-Z0-9].*$/;
const BASE_COUNT_PATTERN = /^([A-Za-z]+)(\d*)$/;

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
    const varNames: VarNames = {}
    let alreadyImportedUseMemo: boolean = false
    let alreadyImportedUseCallback: boolean = false

    const getIndexToInsertImport = (sourceCode) => {
      const allComments = sourceCode.getAllComments()
      let insertImportLoc = 1
      for (let i = 0, l = allComments.length; i < l; i++) {
        const comment = allComments[i]
        // @ts-ignore
        const commentIsBackToBackWithPrev = comment.loc.start.line <= insertImportLoc + 1

        if (!commentIsBackToBackWithPrev) break
        // @ts-ignore
        insertImportLoc = comment.loc.end.line
      }
      try {
        return sourceCode.getIndexFromLoc({ line: insertImportLoc + 1, column: 0 })
      } catch {
        null
      }
    }

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

    const useMemoJsxFix = (fixer: Rule.RuleFixer, node: Rule.Node,  alreadyImportedUseMemo: boolean): Rule.Fix | null => {
      const sourceCode = context.getSourceCode();
      const importIndex = getIndexToInsertImport(sourceCode)
      // const text = sourceCode.getText(scope);
      // @ts-ignore
      const fullSourceText = sourceCode.getText();
      // @ts-ignore
      const block = context.getScope().block.body.body
      if (!block) return null
      const returnLine = block[block.length - 1].loc.start.line
      const lineAboveReturn = sourceCode.getIndexFromLoc({ line: returnLine, column: 0 })

      const nodeText = sourceCode.getText(node)

      const value = nodeText.replace(/^\w*=/, '')
      // @ts-ignore
      const name = nodeText.match(/^\w*/)[0]

      const match = name.match(BASE_COUNT_PATTERN) || []
      const base = match[1] || ''
      const suffix = varNames[base]
      varNames[base] = (suffix || 0) + 1
      // @ts-ignore
      const nameOfConst = `${name}${suffix ? suffix + 1 : ''}`

      const replacedParens = value.replace(/^{/, '(').replace(/\}$/, ')')
      const toInsert = `const ${nameOfConst} = useMemo(() => ${replacedParens}, [])\n\n`

      const importText = 'import { useMemo } from \'react\'\n'
      // @ts-ignore
      return [
        importIndex && !alreadyImportedUseMemo ? fixer.insertTextAfterRange([importIndex, importIndex], importText) : null,
        fixer.insertTextAfterRange([lineAboveReturn, lineAboveReturn], toInsert),
        fixer.replaceText(node, `${name}={${nameOfConst}}`),
      ].filter(i => i)
    }

    const useCallbackFix = (fixer: Rule.RuleFixer, node: Rule.Node, alreadyImportedUseCallback: boolean): Rule.Fix | null => {
      const sourceCode = context.getSourceCode();
      const importIndex = getIndexToInsertImport(sourceCode)
      // @ts-ignore
      const block = context.getScope().block.body.body
      if (!block) return null
      const returnLine = block[block.length - 1].loc.start.line
      const lineAboveReturn = sourceCode.getIndexFromLoc({ line: returnLine, column: 0 })

      const nodeText = sourceCode.getText(node)

      const value = nodeText.replace(/^\w*=/, '')
      // @ts-ignore
      const name = nodeText.match(/^\w*/)[0]

      const match = name.match(BASE_COUNT_PATTERN) || []
      const base = match[1] || ''
      const suffix = varNames[base]
      varNames[base] = (suffix || 0) + 1
      // @ts-ignore
      const nameOfConst = `${name}${suffix ? suffix + 1 : ''}`

      const replacedParens = value.replace(/^{/, '(').replace(/\}$/, '')
      const toInsert = `const ${nameOfConst} = useCallback${replacedParens}, [])\n\n`
      const importText = 'import { useCallback } from \'react\'\n'
      // @ts-ignore
      return [
        importIndex && !alreadyImportedUseCallback ? fixer.insertTextAfterRange([importIndex, importIndex], importText) : null,
        fixer.insertTextAfterRange([lineAboveReturn, lineAboveReturn], toInsert),
        fixer.replaceText(node, `${name}={${nameOfConst}}`),
      ].filter(i => i)
    }

    return {
      ImportDeclaration (node) {
        if (alreadyImportedUseMemo && alreadyImportedUseCallback) return

        if (node.source.value === 'react') {
          const specifiers = node.specifiers
          for (let i = 0, l = specifiers.length; i < l && !alreadyImportedUseMemo; i++) {
            // @ts-ignore
            const name = specifiers[i]?.imported?.name
            if (name === 'useMemo') alreadyImportedUseMemo = true
            if (name === 'useCallback') alreadyImportedUseCallback = true
          }
        }
      },
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
              case MemoStatus.UnmemoizedFunction:
                context.report({ node, messageId: "function-usecallback-props", fix: (fixer) => useCallbackFix(fixer, node, alreadyImportedUseCallback) });
                break;
              // case MemoStatus.UnmemoizedFunctionCall:
              // case MemoStatus.UnmemoizedOther:
              //   if (context.options?.[0]?.strict) {
              //     report(node, "unknown-usememo-props");
              //   }
              //   break;
              case MemoStatus.UnmemoizedJSX:
                context.report({ node, messageId: "jsx-usememo-props", fix: (fixer) => useMemoJsxFix(fixer, node, alreadyImportedUseMemo) });
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

      // Keep track of variable names so we don't conflict
      VariableDeclarator (node) {
        // @ts-ignore
        const varName = node.id?.name
        // console.log('varName', varName)
        // const [_full, base, count] = varName.match(BASE_COUNT_PATTERN) || []
        const match = varName?.match(BASE_COUNT_PATTERN)
        if (!match) return
        const base = match[1]
        const count = parseInt(match[2] || 1)
        // console.log('base count', base, count)
        if (!varNames[base]) {
          varNames[base] = count
        } else if (varNames[base] < count) {
          varNames[base] = count
        }

        // console.log('varNames', varNames)
        // const sourceCode = context.getSourceCode()
      },
    };
  },
};

export default rule;
