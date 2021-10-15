import { RuleTester } from "eslint";
import rule from "../require-usememo";
import { normalizeIndent } from '../utils';

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaFeatures: { jsx: true },
  },
});

ruleTester.run("useMemo", rule, {
  valid: [
    {
      code: normalizeIndent`
        const Component = () => {
          const myObject = React.useMemo(() => ({}), []);
          return <Child prop={myObject} />;
        }
      `,
    },
    {
      code: normalizeIndent`
        const Component = () => {
          const myArray = useMemo(() => [], []);
          return <Child prop={myArray} />;
        }
      `,
    },
    {
      code: normalizeIndent`
        const Component = () => {
          const myArray = React.useMemo(() => new Object(), []);
          return <Child prop={myArray} />;
        }
      `,
    },
    {
      code: normalizeIndent`
        const Component = () => {
          const myObject = {};
          return <div prop={myObject} />;
        }
      `,
    },
    {
      code: normalizeIndent`
        const Component = () => {
          const myArray = [];
          return <div prop={myArray} />;
        }
      `,
    },
    {
      code: normalizeIndent`
        const Component = () => {
          const myNumber1 = 123;
          const myNumber2 = 123 + 456;
          const myString1 = 'abc';
          const myString2 = \`abc\`;
          return <div n1={myNumber} n2={myNumber2} s1={myString1} s2={myString2} />;
        }
      `,
    },
    {
      code: normalizeIndent`
        const Component = () => {
          const myObject = memoize({});
          return <Child prop={myObject} />;
        }
      `,
    },
    {
      code: normalizeIndent`
        const Component = () => {
          const myArray = lodash.memoize([]);
          return <Child prop={myArray} />;
        }
      `,
    },
    {
      code: normalizeIndent`
        const Component = () => {
          const myComplexString = css\`color: red;\`;
          return <Child prop={myComplexString} />;
        }
      `,
    },
  ],
  invalid: [
    {
      code: normalizeIndent`
        const Component = () => {
          const myObject = {};
          return <Child prop={myObject} />;
        }
      `,
      output: normalizeIndent`
        const Component = () => {
          const myObject = React.useMemo(() => ({}), []);
          return <Child prop={myObject} />;
        }
      `,
      errors: [{ messageId: "object-usememo-props" }],
    },
    {
      code: normalizeIndent`
        const Component = () => {
          const myArray = [];
          return <Child prop={myArray} />;
        }
      `,
      output: normalizeIndent`
        const Component = () => {
          const myArray = useMemo(() => [], []);
          return <Child prop={myArray} />;
        }
      `,
      errors: [{ messageId: "array-usememo-props" }],
    },
    {
      code: normalizeIndent`
        const Component = () => {
          const myInstance = new Object();
          return <Child prop={myInstance} />;
        }
      `,
      output: normalizeIndent`
        const Component = () => {
          const myInstance = React.useMemo(() => new Object(), []);
          return <Child prop={myInstance} />;
        }
      `,
      errors: [{ messageId: "instance-usememo-props" }],
    },
    // TODO: setup autofixer for these
    {
      code: normalizeIndent`
        const Component = () => {
          let myObject = useMemo({});
          myObject = {a: 'b'};
          return <Child prop={myObject} />;
        }
      `,
      output: normalizeIndent`
        const Component = () => {
          let myObject = useMemo({});
          myObject = {a: 'b'};
          return <Child prop={myObject} />;
        }
      `,
      errors: [{ messageId: "usememo-const" }],
    },
    // TODO: setup autofixer for these
    {
      code: normalizeIndent`
        const Component = () => {
          return <Child prop={{}} />;
        }
      `,
      output: normalizeIndent`
        const Component = () => {
          return <Child prop={{}} />;
        }
      `,
      errors: [{ messageId: "object-usememo-props" }],
    },
    // TODO: setup autofixer for these
    {
      code: normalizeIndent`
        const Component = () => {
          return <Child prop={[]} />;
        }
      `,
      output: normalizeIndent`
        const Component = () => {
          return <Child prop={[]} />;
        }
      `,
      errors: [{ messageId: "array-usememo-props" }],
    },
    // TODO: setup autofixer for these
    {
      code: normalizeIndent`
        const Component = () => {
          const myObject = memoize({});
          return <Child prop={myObject} />;
        }
      `,
      output: normalizeIndent`
        const Component = () => {
          const myObject = memoize({});
          return <Child prop={myObject} />;
        }
      `,
      options: [{ strict: true }],
      errors: [{ messageId: "unknown-usememo-props" }],
    },
    // TODO: setup autofixer for these
    {
      code: normalizeIndent`
        const Component = () => {
          const myArray = lodash.memoize([]);
        return <Child prop={myArray} />;
        }
      `,
      output: normalizeIndent`
        const Component = () => {
          const myArray = lodash.memoize([]);
        return <Child prop={myArray} />;
        }
      `,
      options: [{ strict: true }],
      errors: [{ messageId: "unknown-usememo-props" }],
    },
    // TODO: setup autofixer for these
    {
      code: normalizeIndent`
        const Component = () => {
          const myArray1 = [];
          const myArray2 = React.useMemo(() => myArray1, [myArray1]);
          return <Child prop={myArray2} />;
        }
      `,
      output: normalizeIndent`
        const Component = () => {
          const myArray1 = [];
          const myArray2 = React.useMemo(() => myArray1, [myArray1]);
          return <Child prop={myArray2} />;
        }
      `,
      errors: [{ messageId: "array-usememo-deps" }],
    },
    // TODO: setup autofixer for these
    {
      code: normalizeIndent`
        const Component = () => {
          const myComplexString = css\`color: red;\`;
          return <Child prop={myComplexString} />;
        }
      `,
      output: normalizeIndent`
        const Component = () => {
          const myComplexString = css\`color: red;\`;
          return <Child prop={myComplexString} />;
        }
      `,
      options: [{ strict: true }],
      errors: [{ messageId: "unknown-usememo-props" }],
    },
  ],
});
