# Task Completion Checklist

When a coding task is completed, ensure the following:

## 1. Type Checking
```bash
npx tsc --noEmit
```
Verify no TypeScript errors were introduced.

## 2. Linting
```bash
yarn lint-quiet
```
Fix any ESLint errors. Warnings are acceptable but errors must be resolved.

## 3. Formatting
```bash
yarn format
```
Or rely on pre-commit hooks (lint-staged) to auto-format.

## 4. Unit Tests
```bash
yarn jest
```
Run the full test suite. If you modified a specific module, you can run:
```bash
yarn jest path/to/file.test.tsx
```

## 5. Snapshot Updates (if applicable)
If snapshot tests fail due to intentional changes:
```bash
yarn jest-update
```

## 6. Build Verification (for significant changes)
```bash
yarn build
```

## Important Notes
- The `yarn test` command runs type checking + lint + jest in sequence
- Pre-commit hooks will auto-format and lint staged files
- neo4j-arc changes must not introduce imports from browser/shared/services
- Ensure new Redux modules are registered in `rootReducer.ts` and `rootEpic.ts`
