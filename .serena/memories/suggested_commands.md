# Suggested Commands

## Setup
```bash
yarn install          # Install dependencies
```

## Development
```bash
yarn start            # Dev server at http://localhost:8080
yarn starts           # Dev server with HTTPS
yarn start-prod       # Production mode locally
yarn starts-prod      # Production mode with HTTPS
```

## Testing
```bash
yarn test             # Full test suite (type check + lint + jest)
yarn jest             # Run jest only
yarn dev              # Jest watch mode
yarn jest path/to/file.test.tsx         # Run single test file
yarn jest path/to/file.test.tsx --watch # Watch single test file
yarn jest-update      # Update snapshots
yarn jest-cov         # Jest with coverage
```

## E2E Testing
```bash
yarn e2e              # Run Cypress tests
yarn e2e-open         # Open Cypress UI
yarn e2e-local        # Run against local server
yarn e2e-local-open   # Open Cypress UI against local server
yarn test-e2e         # Full e2e with Docker (Neo4j 4.2.2)
```

## Code Quality
```bash
yarn lint             # ESLint with auto-fix
yarn lint-quiet       # ESLint errors only
yarn format           # Prettier format all files
```

## Building
```bash
yarn build            # Production webpack build + dist.zip
```

## Type Checking
```bash
npx tsc --noEmit      # Type check without emitting
```

## System Utilities (macOS/Darwin)
```bash
git status            # Check git status
git log --oneline -10 # Recent commits
git diff              # View changes
ls -la                # List files
```
