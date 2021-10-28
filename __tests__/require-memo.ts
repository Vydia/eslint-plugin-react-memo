import { RuleTester } from "eslint";
import rule from "../require-memo";
import { normalizeIndent } from '../utils';

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaFeatures: { jsx: true },
  },
});

ruleTester.run("memo", rule, {
  valid: [
    {
      code: normalizeIndent`
        const Component = memo(() => <div />)
      `,
    },
    {
      code: normalizeIndent`
        const Component = memo(() => <div />)
      `,
    },
    {
      code: normalizeIndent`
        const Component = memo(useRef(() => <div />))
      `,
    },
    {
      code: normalizeIndent`
        const Component = useRef(memo(() => <div />))
      `,
    },
    {
      code: normalizeIndent`
        const myFunction = () => <div />
      `,
    },
    {
      code: normalizeIndent`
        const myFunction = wrapper(() => <div />)
      `,
    },
    {
      code: normalizeIndent`
        const Component = memo(function() { return <div />; });
      `,
    },
    {
      code: normalizeIndent`
        const Component = memo(function Component() { return <div />; });
      `,
    },
    {
      code: normalizeIndent`
        const myFunction = () => <div />
      `,
    },
    {
      code: normalizeIndent`
        const myFunction = wrapper(() => <div />)
      `,
    },
    {
      code: normalizeIndent`
        function myFunction() { return <div />; }
      `,
    },
    {
      code: normalizeIndent`
        const myFunction = wrapper(function() { return <div /> })
      `,
    },
    {
      filename: "dir/myFunction.js",
      parserOptions: { ecmaVersion: 6, sourceType: "module" },
      code: normalizeIndent`
        export default function() { return <div /> };
      `,
    },
  ],
  invalid: [
    {
      code: `import { memo } from 'react'
const Component = () => <div />`,
      errors: [{ messageId: "memo-required" }],
      output: `import { memo } from 'react'
const Component = memo(() => <div />)`
    },
    {
      code: `// @flow
      import { map } from 'lodash'
const Component = useRef(() => <div />)`,
      errors: [{ messageId: "memo-required" }],
      output: `// @flow
import { memo } from 'react'
      import { map } from 'lodash'
const Component = memo(useRef(() => <div />))`
    },
//     {
//       code: `const Component = function Component() { return <div />; }`,
//       errors: [{ messageId: "memo-required" }],
//       output: `import { memo } from 'react'
// const Component = memo(function Component() { return <div />; })`
//     },
//     {
//       code: `const Component = useRef(function() { return <div />; })`,
//       errors: [{ messageId: "memo-required" }],
//       output: `import { memo } from 'react'
// const Component = useRef(memo(function() { return <div />; }))`
//     },
    {
      code: `// @flow
import { map } from 'lodash'

console.warn('Hello World')
function Component() { return <div />; }`,
      errors: [{ messageId: "memo-required" }],
      output: `// @flow
import { memo } from 'react'
import { map } from 'lodash'

console.warn('Hello World')
memo(function Component() { return <div />; })`
    },
    {
      code: `import { memo } from 'react'

function Component() { return <div />; }`,
      errors: [{ messageId: "memo-required" }],
      output: `import { memo } from 'react'

memo(function Component() { return <div />; })`
    },
    // {
    //   filename: "dir/Component.js",
    //   parserOptions: { ecmaVersion: 6, sourceType: "module" },
    //   code: export default function() { return <div /> };,
    //   errors: [{ messageId: "memo-required" }],
    // },
  ],
});
