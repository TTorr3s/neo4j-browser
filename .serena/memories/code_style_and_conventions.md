# Code Style and Conventions

## Prettier Configuration
- Single quotes (`singleQuote: true`)
- No semicolons (`semi: false`)
- 2-space indentation (`tabWidth: 2`)
- 80 character print width
- No trailing commas (`trailingComma: "none"`)
- Arrow function parens: avoid when possible (`arrowParens: "avoid"`)
- JSX uses double quotes (`jsxSingleQuote: false`)
- Import sorting via `@trivago/prettier-plugin-sort-imports`:
  1. Testing library imports
  2. Third-party modules
  3. `neo4j-arc/*`
  4. `browser/*`, `project-root/*`, `browser-*`, `shared/*`, `services/*`, `icons/*`, relative imports

## ESLint Configuration (Flat config: eslint.config.mjs)
- TypeScript-ESLint recommended rules
- React and React Hooks rules
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: warn
- `react-hooks/exhaustive-deps`: warn
- `react/prop-types`: error (for .ts/.tsx files)
- Restricted imports enforced for neo4j-arc isolation

## TypeScript
- Strict mode enabled
- `noImplicitAny: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- Target: ES2019
- JSX: react-jsx (automatic runtime)

## Component Patterns
- **All components are functional** (no class components)
- Use `useSelector` and `useDispatch` hooks instead of `connect` HOC
- Use `React.memo` with custom comparators for expensive components
- Use `useBus` hook for event bus access (react-suber)

## Redux Module (Duck) Pattern
Each module exports:
- `NAME` constant (module name)
- Action type string constants (e.g., `'connections/SET_ACTIVE'`)
- Action creators (functions)
- Default export: reducer function
- Named exports: epics (RxJS Observable-based)

## Naming Conventions
- Files: camelCase for ducks (e.g., `connectionsDuck.ts`), PascalCase for components (e.g., `CypherFrame.tsx`)
- Constants: UPPER_SNAKE_CASE for action types
- Functions/variables: camelCase
- Types/Interfaces: PascalCase
- Redux selectors: camelCase (e.g., `getActiveConnection`)

## Pre-commit Hooks
- Husky + lint-staged
- Runs Prettier on changed `{js,jsx,ts,tsx,css,json}` files
- Runs ESLint (quiet) on changed `{ts,tsx}` files
