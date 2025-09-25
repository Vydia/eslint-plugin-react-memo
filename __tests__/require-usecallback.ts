// import { RuleTester } from "eslint";
// import rule from "../require-usememo";
// import { normalizeIndent } from '../utils';

// const ruleTester = new RuleTester({
//   parser: require.resolve("@typescript-eslint/parser"),
//   parserOptions: {
//     ecmaFeatures: { jsx: true },
//   },
// });

// ruleTester.run("useCallback", rule, {
//   valid: [
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn = useCallback(function() {}, []);
//           return <Child prop={myFn} />;
//         }
//       `,
//     },
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn = useCallback(() => {}, []);
//           return <Child prop={myFn} />;
//         }
//       `,
//     },
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn = function() {};
//           return <div prop={myFn} />;
//         }
//       `,
//     },
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn = () => {};
//           return <div prop={myFn} />;
//         }
//       `,
//     },
//     {
//       code: normalizeIndent`
//         const myFn = () => {};
//         const Component = () => {
//           return <div prop={myFn} />;
//         }
//       `,
//     },
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn1 = useCallback(() => [], []);
//           const myFn2 = useCallback(() => myFn1, [myFn1]);
//           return <Child prop={myFn2} />;
//         }
//       `,
//     },
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn = memoize(() => {});
//           return <Child prop={myFn} />;
//         }
//       `,
//     },
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn = lodash.memoize(() => []);
//           return <Child prop={myFn} />;
//         }
//       `,
//     },
//   ],
//   invalid: [
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn = function myFn() {};
//           return <Child prop={myFn} />;
//         }
//       `,
//       output: normalizeIndent`
//         const Component = () => {
//           const myFn = useCallback(function() {}, []);
//           return <Child prop={myFn} />;
//         }
//       `,
//       errors: [{ messageId: "function-usecallback-props" }],
//     },
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn = () => {};
//           return <Child prop={myFn} />;
//         }
//       `,
//       output: normalizeIndent`
//         const Component = () => {
//           const myFn = useCallback(() => {}, []);
//           return <Child prop={myFn} />;
//         }
//       `,
//       errors: [{ messageId: "function-usecallback-props" }],
//     },
//     // TODO: setup fixer for the following spec (output currently matches code)
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           let myFn = useCallback(() => ({}));
//           myFn = () => ({});
//           return <Child prop={myFn} />;
//         }
//       `,
//       output: normalizeIndent`
//         const Component = () => {
//           let myFn = useCallback(() => ({}));
//           myFn = () => ({});
//           return <Child prop={myFn} />;
//         }
//       `,
//       errors: [{ messageId: "usememo-const" }],
//     },
//     // TODO: setup fixer for the following spec (output currently matches code)
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           return <Child prop={() => {}} />;
//         }
//       `,
//       output: normalizeIndent`
//         const Component = () => {
//           return <Child prop={() => {}} />;
//         }
//       `,
//       errors: [{ messageId: "function-usecallback-props" }],
//     },
//     // TODO: setup fixer for the following spec (output currently matches code)
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           return <Child prop={() => []} />;
//         }
//       `,
//       output: normalizeIndent`
//         const Component = () => {
//           return <Child prop={() => []} />;
//         }
//       `,
//       errors: [{ messageId: "function-usecallback-props" }],
//     },
//     // // TODO: setup fixer for the following spec (output currently matches code)
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn = memoize(() => {});
//           return <Child prop={myFn} />;
//         }
//       `,
//       output: normalizeIndent`
//         const Component = () => {
//           const myFn = memoize(() => {});
//           return <Child prop={myFn} />;
//         }
//       `,
//       options: [{ strict: true }],
//       errors: [{ messageId: "unknown-usememo-props" }],
//     },
//     // // TODO: setup fixer for the following spec (output currently matches code)
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn = lodash.memoize(() => []);
//           return <Child prop={myFn} />;
//         }
//       `,
//       output: normalizeIndent`
//         const Component = () => {
//           const myFn = lodash.memoize(() => []);
//           return <Child prop={myFn} />;
//         }
//       `,
//       options: [{ strict: true }],
//       errors: [{ messageId: "unknown-usememo-props" }],
//     },
//     // // TODO: setup fixer for the following spec (output currently matches code)
//     {
//       code: normalizeIndent`
//         const Component = () => {
//           const myFn1 = () => [];
//           const myFn2 = useCallback(() => myFn1, [myFn1]);
//           return <Child prop={myFn2} />;
//         }
//       `,
//       output: normalizeIndent`
//         const Component = () => {
//           const myFn1 = () => [];
//           const myFn2 = useCallback(() => myFn1, [myFn1]);
//           return <Child prop={myFn2} />;
//         }
//       `,
//       errors: [{ messageId: "function-usecallback-deps" }],
//     },
//     {
//       code: normalizeIndent`
//         // @flow
//         import { d2Uri } from 'd2/utils/Routes'
//         import { prettyNumber } from '@vydia/js-core'
//         import { useHistory } from 'react-router'
//         import { useIsLabel } from 'd2/hooks/useIsLabel'
//         import { useOrganizationTotalConflictsBoxQuery, useUserTotalConflictsBoxQuery } from './queries'
//         import SummaryBox from 'd2/components/SummaryBox'
//         import useTranslations from './translations'
//         import type { StatelessFunctionalComponent } from 'react'

//         const TotalConflictsBox: StatelessFunctionalComponent<{}> = () => {
//           const [isLabel] = useIsLabel()
//           const [organizationData] = useOrganizationTotalConflictsBoxQuery({ isLabel })
//           const [userData] = useUserTotalConflictsBoxQuery({ isLabel })
//           const t = useTranslations()
//           const history = useHistory()

//           const data = isLabel ? organizationData : userData
//           return (<SummaryBox
//             icon='ban'
//             onClick={() => history.push(d2Uri('/insights/conflicts'))}
//             testID='WidgetDashboard-TotalConflictsBox'
//             title={isLabel ? t.labelTotalConflicts : t.userTotalConflicts}
//             value={data && prettyNumber(data.totalConflicts)}
//           />)
//         }

//         export default TotalConflictsBox
//       `,
//       output: normalizeIndent`
//         // @flow
//         import { d2Uri } from 'd2/utils/Routes'
//         import { prettyNumber } from '@vydia/js-core'
//         import { useHistory } from 'react-router'
//         import { useIsLabel } from 'd2/hooks/useIsLabel'
//         import { useOrganizationTotalConflictsBoxQuery, useUserTotalConflictsBoxQuery } from './queries'
//         import SummaryBox from 'd2/components/SummaryBox'
//         import useTranslations from './translations'
//         import type { StatelessFunctionalComponent } from 'react'

//         const TotalConflictsBox: StatelessFunctionalComponent<{}> = () => {
//           const [isLabel] = useIsLabel()
//           const [organizationData] = useOrganizationTotalConflictsBoxQuery({ isLabel })
//           const [userData] = useUserTotalConflictsBoxQuery({ isLabel })
//           const t = useTranslations()
//           const history = useHistory()
//           const onClickConflicts = useCallback(() => history.push(d2Uri('/insights/conflicts')), [history])

//           const data = isLabel ? organizationData : userData
//           return (<SummaryBox
//             icon='ban'
//             onClick={onClickConflicts}
//             testID='WidgetDashboard-TotalConflictsBox'
//             title={isLabel ? t.labelTotalConflicts : t.userTotalConflicts}
//             value={data && prettyNumber(data.totalConflicts)}
//           />)
//         }

//         export default TotalConflictsBox
//       `,
//       errors: [{ messageId: "function-usecallback-props"}]
//     }
//   ],
// });
