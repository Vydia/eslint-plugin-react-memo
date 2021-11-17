'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () {
                        return e[k];
                    }
                });
            }
        });
    }
    n['default'] = e;
    return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespace(path);

var componentNameRegex$1 = /^[^a-z]/;
var memoImportText = 'import { memo } from \'react\'\n';
function isMemoCallExpression(node) {
    if (node.type !== "CallExpression")
        return false;
    if (node.callee.type === "MemberExpression") {
        var _a = node.callee, object = _a.object, property = _a.property;
        if (object.type === "Identifier" &&
            property.type === "Identifier" &&
            object.name === "React" &&
            property.name === "memo") {
            return true;
        }
    }
    else if (node.callee.type === "Identifier" && node.callee.name === "memo") {
        return true;
    }
    return false;
}
function checkFunction(context, node, alreadyImportedMemo) {
    var currentNode = node.parent;
    while (currentNode.type === "CallExpression") {
        if (isMemoCallExpression(currentNode)) {
            return;
        }
        currentNode = currentNode.parent;
    }
    if (currentNode.type === "VariableDeclarator") {
        var id = currentNode.id;
        if (id.type === "Identifier") {
            if (componentNameRegex$1.test(id.name)) {
                context.report({ node: node, messageId: "memo-required", fix: function (fixer) {
                        // @ts-ignore
                        var parent = node.parent;
                        var scope;
                        if (parent.type === 'VariableDeclarator') {
                            scope = node;
                        }
                        else {
                            scope = parent;
                        }
                        var sourceCode = context.getSourceCode();
                        var getIndexToInsertImport = function () {
                            var allComments = sourceCode.getAllComments();
                            var insertImportLoc = 1;
                            for (var i = 0, l = allComments.length; i < l; i++) {
                                var comment = allComments[i];
                                // @ts-ignore
                                var commentIsBackToBackWithPrev = comment.loc.start.line <= insertImportLoc + 1;
                                if (!commentIsBackToBackWithPrev)
                                    break;
                                // @ts-ignore
                                insertImportLoc = comment.loc.end.line;
                            }
                            try {
                                return sourceCode.getIndexFromLoc({ line: insertImportLoc + 1, column: 0 });
                            }
                            catch (_a) {
                            }
                        };
                        var importIndex = getIndexToInsertImport();
                        var text = sourceCode.getText(scope);
                        // @ts-ignore
                        sourceCode.getText();
                        var fixedCode = "memo(" + text + ")";
                        if (text.startsWith('useRef(function')) {
                            fixedCode = "useRef(" + text.replace('useRef', 'memo') + ")";
                        }
                        // @ts-ignore
                        return [
                            importIndex && !alreadyImportedMemo ? fixer.insertTextAfterRange([importIndex, importIndex], memoImportText) : null,
                            fixer.replaceText(scope, fixedCode),
                        ].filter(function (i) { return i; });
                    } });
            }
        }
    }
    else if (node.type === "FunctionDeclaration" &&
        currentNode.type === "Program") {
        if (node.id !== null && componentNameRegex$1.test(node.id.name)) {
            context.report({ node: node, messageId: "memo-required", fix: function (fixer) {
                    var scope = node;
                    var sourceCode = context.getSourceCode();
                    var getIndexToInsertImport = function () {
                        var allComments = sourceCode.getAllComments();
                        var insertImportLoc = 1;
                        for (var i = 0, l = allComments.length; i < l; i++) {
                            var comment = allComments[i];
                            // @ts-ignore
                            var commentIsBackToBackWithPrev = comment.loc.start.line <= insertImportLoc + 1;
                            if (!commentIsBackToBackWithPrev)
                                break;
                            // @ts-ignore
                            insertImportLoc = comment.loc.end.line;
                        }
                        try {
                            return sourceCode.getIndexFromLoc({ line: insertImportLoc + 1, column: 0 });
                        }
                        catch (_a) {
                        }
                    };
                    var importIndex = getIndexToInsertImport();
                    var text = sourceCode.getText(scope);
                    sourceCode.getText();
                    var fixedCode = "memo(" + text + ")";
                    // @ts-ignore
                    return [
                        importIndex && !alreadyImportedMemo ? fixer.insertTextAfterRange([importIndex, importIndex], memoImportText) : null,
                        fixer.replaceText(node, fixedCode),
                    ].filter(function (i) { return i; });
                } });
        }
        else {
            if (context.getFilename() === "<input>")
                return;
            var filename = path__namespace.basename(context.getFilename());
            if (componentNameRegex$1.test(filename)) {
                context.report({ node: node, messageId: "memo-required" });
            }
        }
    }
}
var rule$2 = {
    meta: {
        fixable: 'code',
        messages: {
            "memo-required": "Component definition not wrapped in React.memo()"
        }
    },
    create: function (context) {
        var alreadyImportedMemo = false;
        return {
            ImportDeclaration: function (node) {
                var _a, _b;
                if (alreadyImportedMemo)
                    return;
                if (node.source.value === 'react') {
                    var specifiers = node.specifiers;
                    for (var i = 0, l = specifiers.length; i < l && !alreadyImportedMemo; i++) {
                        // @ts-ignore
                        var name_1 = (_b = (_a = specifiers[i]) === null || _a === void 0 ? void 0 : _a.imported) === null || _b === void 0 ? void 0 : _b.name;
                        if (name_1 === 'memo')
                            alreadyImportedMemo = true;
                    }
                }
            },
            ArrowFunctionExpression: function (node) {
                checkFunction(context, node, alreadyImportedMemo);
            },
            FunctionDeclaration: function (node) {
                checkFunction(context, node, alreadyImportedMemo);
            },
            FunctionExpression: function (node) {
                checkFunction(context, node, alreadyImportedMemo);
            }
        };
    }
};

var hookNames = [
    'useState',
    'useEffect',
    'useContext',
    'useReducer',
    'useCallback',
    'useMemo',
    'useRef',
    'useImperativeHandle',
    'useLayoutEffect',
    'useDebugValue',
];
function isHook(node) {
    if (node.type === "Identifier") {
        return Boolean(hookNames.find(function (a) { return a.includes(node.name); }));
    }
    else if (node.type === "MemberExpression" &&
        !node.computed &&
        isHook(node.property)) {
        var obj = node.object;
        return obj.type === "Identifier" && obj.name === "React";
    }
    else {
        return false;
    }
}

var componentNameRegex = /^[^a-z]/;
function isComplexComponent(node) {
    if (node.type !== "JSXOpeningElement")
        return false;
    if (node.name.type !== "JSXIdentifier")
        return false;
    return componentNameRegex.test(node.name.name);
}
var MemoStatus;
(function (MemoStatus) {
    MemoStatus[MemoStatus["Memoized"] = 0] = "Memoized";
    MemoStatus[MemoStatus["UnmemoizedObject"] = 1] = "UnmemoizedObject";
    MemoStatus[MemoStatus["UnmemoizedArray"] = 2] = "UnmemoizedArray";
    MemoStatus[MemoStatus["UnmemoizedNew"] = 3] = "UnmemoizedNew";
    MemoStatus[MemoStatus["UnmemoizedFunction"] = 4] = "UnmemoizedFunction";
    MemoStatus[MemoStatus["UnmemoizedFunctionCall"] = 5] = "UnmemoizedFunctionCall";
    MemoStatus[MemoStatus["UnmemoizedJSX"] = 6] = "UnmemoizedJSX";
    MemoStatus[MemoStatus["UnmemoizedOther"] = 7] = "UnmemoizedOther";
})(MemoStatus || (MemoStatus = {}));
function isCallExpression(node, name) {
    if (node.callee.type === "MemberExpression") {
        var _a = node.callee, object = _a.object, property = _a.property;
        if (object.type === "Identifier" &&
            property.type === "Identifier" &&
            object.name === "React" &&
            property.name === name) {
            return true;
        }
    }
    else if (node.callee.type === "Identifier" && node.callee.name === name) {
        return true;
    }
    return false;
}
function getIdentifierMemoStatus(context, _a) {
    var name = _a.name;
    var variable = context.getScope().variables.find(function (v) { return v.name === name; });
    if (variable === undefined)
        return MemoStatus.Memoized;
    var node = variable.defs[0].node;
    if (node.type !== "VariableDeclarator")
        return MemoStatus.Memoized;
    if (node.parent.kind === "let") {
        context.report({ node: node, messageId: "usememo-const" });
    }
    return getExpressionMemoStatus(context, node.init);
}
function getExpressionMemoStatus(context, expression) {
    switch (expression === null || expression === void 0 ? void 0 : expression.type) {
        case "ObjectExpression":
            return MemoStatus.UnmemoizedObject;
        case "ArrayExpression":
            return MemoStatus.UnmemoizedArray;
        case "NewExpression":
            return MemoStatus.UnmemoizedNew;
        case "FunctionExpression":
        case "ArrowFunctionExpression":
            return MemoStatus.UnmemoizedFunction;
        case "JSXElement":
            return MemoStatus.UnmemoizedJSX;
        case "CallExpression":
            if (isCallExpression(expression, "useMemo") ||
                isCallExpression(expression, "useCallback")) {
                return MemoStatus.Memoized;
            }
            return MemoStatus.UnmemoizedFunctionCall;
        case "Identifier":
            return getIdentifierMemoStatus(context, expression);
        case "BinaryExpression":
            return MemoStatus.Memoized;
        default:
            return MemoStatus.UnmemoizedOther;
    }
}

var messages$1 = {
    "object-usememo-props": "Object literal should be wrapped in React.useMemo() when used as a prop",
    "object-usememo-deps": "Object literal should be wrapped in React.useMemo() when used as a hook dependency",
    "array-usememo-props": "Array literal should be wrapped in React.useMemo() when used as a prop",
    "array-usememo-deps": "Array literal should be wrapped in React.useMemo() when used as a hook dependency",
    "instance-usememo-props": "Object instantiation should be wrapped in React.useMemo() when used as a prop",
    "instance-usememo-deps": "Object instantiation should be wrapped in React.useMemo() when used as a hook dependency",
    "jsx-usememo-props": "JSX should be wrapped in React.useMemo() when used as a prop",
    "jsx-usememo-deps": "JSX should be wrapped in React.useMemo() when used as a hook dependency",
    "function-usecallback-props": "Function definition should be wrapped in React.useCallback() when used as a prop",
    "function-usecallback-deps": "Function definition should be wrapped in React.useCallback() when used as a hook dependency",
    "unknown-usememo-props": "Unknown value may need to be wrapped in React.useMemo() when used as a prop",
    "unknown-usememo-deps": "Unknown value may need to be wrapped in React.useMemo() when used as a hook dependency",
    "usememo-const": "useMemo/useCallback return value should be assigned to a const to prevent reassignment"
};
var rule$1 = {
    meta: {
        fixable: 'code',
        messages: messages$1,
        schema: [
            {
                type: "object",
                properties: { strict: { type: "boolean" } },
                additionalProperties: false
            },
        ]
    },
    create: function (context) {
        function report(node, messageId) {
            context.report({ node: node, messageId: messageId });
        }
        return {
            JSXAttribute: function (node) {
                var _a, _b;
                var _c = node, parent = _c.parent, value = _c.value;
                if (value === null)
                    return;
                if (!isComplexComponent(parent))
                    return;
                if (value.type === "JSXExpressionContainer") {
                    var expression = value.expression;
                    if ((expression === null || expression === void 0 ? void 0 : expression.type) !== "JSXEmptyExpression") {
                        switch (getExpressionMemoStatus(context, expression)) {
                            case MemoStatus.UnmemoizedObject:
                                context.report({ node: node, messageId: "object-usememo-props" });
                                break;
                            case MemoStatus.UnmemoizedArray:
                                context.report({ node: node, messageId: "array-usememo-props" });
                                break;
                            case MemoStatus.UnmemoizedNew:
                                context.report({ node: node, messageId: "instance-usememo-props" });
                                break;
                            case MemoStatus.UnmemoizedFunction:
                                context.report({ node: node, messageId: "function-usecallback-props" });
                                break;
                            case MemoStatus.UnmemoizedFunctionCall:
                            case MemoStatus.UnmemoizedOther:
                                if ((_b = (_a = context.options) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.strict) {
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
            CallExpression: function (node) {
                var _a, _b;
                var callee = node.callee;
                if (!isHook(callee))
                    return;
                var _c = node.arguments, dependencies = _c[1];
                if (dependencies !== undefined &&
                    dependencies.type === "ArrayExpression") {
                    for (var _i = 0, _d = dependencies.elements; _i < _d.length; _i++) {
                        var dep = _d[_i];
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
                                    if ((_b = (_a = context.options) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.strict) {
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
            }
        };
    }
};

var messages = {
    "object-usememo-children": "Object literal should be wrapped in React.useMemo() when used as children",
    "array-usememo-children": "Array literal should be wrapped in React.useMemo() when used as children",
    "instance-usememo-children": "Object instantiation should be wrapped in React.useMemo() when used as children",
    "jsx-usememo-children": "JSX should be wrapped in React.useMemo() when used as children",
    "function-usecallback-children": "Function definition should be wrapped in React.useCallback() when used as children",
    "unknown-usememo-children": "Unknown value may need to be wrapped in React.useMemo() when used as children",
    "usememo-const": "useMemo/useCallback return value should be assigned to a const to prevent reassignment"
};
var rule = {
    meta: {
        messages: messages,
        fixable: 'code',
        schema: [
            {
                type: "object",
                properties: { strict: { type: "boolean" } },
                additionalProperties: false
            },
        ]
    },
    create: function (context) {
        function report(node, messageId) {
            context.report({ node: node, messageId: messageId });
        }
        return {
            JSXElement: function (node) {
                var _a, _b;
                var _c = node, children = _c.children, openingElement = _c.openingElement;
                if (!isComplexComponent(openingElement))
                    return;
                for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
                    var child = children_1[_i];
                    if (child.type === "JSXElement" || child.type === "JSXFragment") {
                        report(node, "jsx-usememo-children");
                        return;
                    }
                    if (child.type === "JSXExpressionContainer") {
                        var expression = child.expression;
                        if ((expression === null || expression === void 0 ? void 0 : expression.type) !== "JSXEmptyExpression") {
                            switch (getExpressionMemoStatus(context, expression)) {
                                case MemoStatus.UnmemoizedObject:
                                    report(node, "object-usememo-children");
                                    break;
                                case MemoStatus.UnmemoizedArray:
                                    report(node, "array-usememo-children");
                                    break;
                                case MemoStatus.UnmemoizedNew:
                                    report(node, "instance-usememo-children");
                                    break;
                                case MemoStatus.UnmemoizedFunction:
                                    report(node, "function-usecallback-children");
                                    break;
                                case MemoStatus.UnmemoizedFunctionCall:
                                case MemoStatus.UnmemoizedOther:
                                    if ((_b = (_a = context.options) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.strict) {
                                        report(node, "unknown-usememo-children");
                                    }
                                    break;
                                case MemoStatus.UnmemoizedJSX:
                                    report(node, "jsx-usememo-children");
                                    break;
                            }
                        }
                    }
                }
            }
        };
    }
};

var rules = {
    "require-memo": rule$2,
    "require-usememo": rule$1,
    "require-usememo-children": rule
};

exports.rules = rules;
