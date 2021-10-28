import { Rule } from "eslint";
import * as ESTree from "estree";
import * as path from "path";

const componentNameRegex = /^[^a-z]/;
const memoImportText = 'import { memo } from \'react\'\n'

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
    Rule.NodeParentExtension,
  alreadyImportedMemo: boolean
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
        context.report({ node, messageId: "memo-required", fix: (fixer): Rule.Fix | null  => {
          // @ts-ignore
          const parent = node.parent
          let scope
          if (parent.type === 'VariableDeclarator') {
            scope = node
          } else {
            scope = parent
          }

          const sourceCode = context.getSourceCode();

          const getIndexToInsertImport = () => {
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

          const importIndex = getIndexToInsertImport()
          const text = sourceCode.getText(scope);
          // @ts-ignore
          const fullSourceText = sourceCode.getText();

          let fixedCode = `memo(${text})`
          if (text.startsWith('useRef(function')) {
            fixedCode = `useRef(${text.replace('useRef', 'memo')})`
          }
          // @ts-ignore
          return [
            importIndex && !alreadyImportedMemo ? fixer.insertTextAfterRange([importIndex, importIndex], memoImportText) : null,
            fixer.replaceText(scope, fixedCode),
          ].filter(i => i)
        } });
      }
    }
  } else if (
    node.type === "FunctionDeclaration" &&
    currentNode.type === "Program"
  ) {
    if (node.id !== null && componentNameRegex.test(node.id.name)) {
      context.report({ node, messageId: "memo-required", fix: (fixer): Rule.Fix => {
        let scope = node
        const sourceCode = context.getSourceCode();

        const getIndexToInsertImport = () => {
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

        const importIndex = getIndexToInsertImport()

        const text = sourceCode.getText(scope);
        const fullSourceText = sourceCode.getText();
        let fixedCode = `memo(${text})`
        // @ts-ignore
        return [
          importIndex && !alreadyImportedMemo ? fixer.insertTextAfterRange([importIndex, importIndex], memoImportText) : null,
          fixer.replaceText(node, fixedCode),
        ].filter(i => i)
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
  create: (context) => {
    let alreadyImportedMemo = false

    return {
      ImportDeclaration (node) {
        if (alreadyImportedMemo) return

        if (node.source.value === 'react') {
          const specifiers = node.specifiers
          for (let i = 0, l = specifiers.length; i < l && !alreadyImportedMemo; i++) {
            // @ts-ignore
            const name = specifiers[i]?.imported?.name
            if (name === 'memo') alreadyImportedMemo = true
          }
        }
      },
      ArrowFunctionExpression(node) {
        checkFunction(context, node, alreadyImportedMemo);
      },
      FunctionDeclaration(node) {
        checkFunction(context, node, alreadyImportedMemo);
      },
      FunctionExpression(node) {
        checkFunction(context, node, alreadyImportedMemo);
      },
    }
  },
};

export default rule;
