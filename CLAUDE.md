# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Neo4j Browser is a React-based GUI for Neo4j databases. It's built with TypeScript, Redux, Redux-Observable (RxJS epics), and styled-components. The application connects to Neo4j databases via the neo4j-driver (bolt protocol) to execute Cypher queries and visualize graph data.

## Development Commands

### Setup
```bash
yarn install
```

### Development Servers
```bash
yarn start          # Development mode on http://localhost:8080
yarn starts         # Development mode with HTTPS
yarn start-prod     # Production mode locally
yarn starts-prod    # Production mode with HTTPS
```

### Testing
```bash
# Unit tests
yarn test           # Type check + lint + jest
yarn jest           # Run jest only
yarn dev            # Jest watch mode
yarn jest-update    # Update snapshots

# E2E tests (Cypress)
yarn test-e2e       # Full e2e with docker (Neo4j 4.2.2, requires docker, uses ports 7474/7687/8080)
yarn e2e            # Run Cypress tests (requires fresh Neo4j install)
yarn e2e-open       # Open Cypress UI
yarn e2e-local      # Run against existing server (default password: "newpassword")
yarn e2e-local-open # Open Cypress UI against existing server
yarn e2e-aura       # Run against Aura (HTTPS)
yarn e2e-aura-open  # Open Cypress UI against Aura
```

#### E2E Environment Variables
```bash
--env server=3.4|3.5|4.0|4.1|4.2|4.3|4.4|5.0+ (default 4.3)
--env edition=enterprise|community|aura (default enterprise)
--env browser-password=<password> (default 'newpassword')
--env include-import-tests=true|false (default false)
--env bolt-url=<bolt-url> (default localhost:7687)

# System environment variables (set before command)
CYPRESS_E2E_TEST_ENV=local|aura|null
CYPRESS_BASE_URL=<url> (default http://localhost:8080)
```

### Code Quality
```bash
yarn lint           # ESLint with auto-fix
yarn lint-quiet     # ESLint with only errors
yarn format         # Prettier-ESLint format all files
```

### Building
```bash
yarn build          # Production webpack build
```

## Architecture

### Module Isolation: neo4j-arc

The codebase enforces strict module boundaries for `neo4j-arc`, a reusable component library:

- **Location**: `src/neo4j-arc/`
- **Exports**:
  - `neo4j-arc/common` - Shared utilities and components
  - `neo4j-arc/graph-visualization` - D3-based graph rendering
  - `neo4j-arc/cypher-language-support` - Monaco editor Cypher language support
- **Isolation Rules** (enforced by ESLint):
  - `neo4j-arc` code CANNOT import from `browser/*`, `shared/*`, or `services/*`
  - `neo4j-arc` code CANNOT use Redux, react-redux, or react-suber
  - Browser/shared code must import from `neo4j-arc` using aliases only (e.g., `import { X } from 'neo4j-arc/common'`)
  - Never use relative imports like `../../neo4j-arc/common`

### State Management

**Redux + Redux-Observable Architecture**:
- **Store**: Configured in `src/browser/AppInit.tsx`
- **Reducers**: Combined in `src/shared/rootReducer.ts` (duck pattern modules)
- **Epics**: Combined in `src/shared/rootEpic.ts` (RxJS-based side effects)
- **Middleware**: Suber (event bus), Epic middleware, LocalStorage sync

**Module Pattern (Duck)**:
Each domain uses the "duck" pattern - single file containing:
- Action types (constants)
- Action creators
- Reducer
- Epics (for async operations)

Example modules: `connectionsDuck`, `commandsDuck`, `framesDuck`, `cypherDuck`

### Directory Structure

```
src/
├── browser/           # Browser-specific UI and modules
│   ├── modules/       # Feature modules (App, Frame, Stream, Sidebar, Editor, etc.)
│   ├── components/    # Shared React components
│   ├── hooks/         # Custom React hooks
│   └── services/      # Browser-specific services
├── shared/            # Shared business logic
│   ├── modules/       # Redux ducks (connections, commands, cypher, dbMeta, etc.)
│   └── services/      # Shared services
└── neo4j-arc/         # Isolated reusable library
    ├── common/        # Shared utilities
    ├── graph-visualization/  # D3 graph rendering
    └── cypher-language-support/ # Monaco Cypher support
```

### Path Aliases (tsconfig.json)

```typescript
"services/*": ["shared/services/*"]
"browser-services/*": ["browser/services/*"]
"browser-components/*": ["browser/components/*"]
"browser-hooks/*": ["browser/hooks/*"]
"browser-styles/*": ["browser/styles/*"]
"icons/*": ["browser/icons/*"]
"project-root/*": ["../*"]
"neo4j-arc/graph-visualization": ["neo4j-arc/graph-visualization"]
"neo4j-arc/common": ["neo4j-arc/common"]
"neo4j-arc/cypher-language-support": ["neo4j-arc/cypher-language-support"]
```

### Key Technologies

- **React 18.3.1** with functional components and hooks
- **TypeScript 4.9.5**
- **Redux 4.2.1** + **Redux-Observable 1.2.0** (RxJS 6.6.7)
- **neo4j-driver 6.0.1** for database connectivity
- **styled-components 5.3.3** for styling
- **Monaco Editor 0.55.0** for code editing
- **D3 v3** (d3-force, d3-zoom, d3-selection, d3-drag, d3-color, d3-shape, d3-transition) for graph visualization
- **Cypress 13.17.0** for E2E testing
- **Jest 29.7.0** for unit testing
- **Webpack 5.95.0** for bundling

### Connection Flow

1. User connects via `connectionsDuck` actions
2. `connectEpic` establishes neo4j-driver connection
3. `startupConnectionSuccessEpic` triggers metadata fetching
4. `dbMetaEpic` fetches schema, labels, relationship types
5. Commands execute via `commandsDuck` → `cypherDuck` → neo4j-driver

### Command Execution

Commands (e.g., `:play`, `:help`, Cypher queries) flow:
1. Editor → `handleCommandEpic` (commandsDuck)
2. Parsed and routed to appropriate handler
3. Cypher queries → `cypherRequestEpic` (cypherDuck)
4. Results rendered in Frame components (framesDuck)

### LocalStorage Sync

Keys synced to localStorage (configured in `src/shared/services/localstorage.ts`):
- connections (with credential retention logic)
- settings
- history (with retention setting check)
- documents (favorites)
- folders
- grass (styling)
- udc
- experimentalFeatures

## Common Patterns

### Creating a New Redux Module

1. Create `src/shared/modules/myFeature/myFeatureDuck.ts`
2. Export NAME, action types, action creators, reducer
3. Add epics for async operations
4. Register reducer in `src/shared/rootReducer.ts`
5. Register epics in `src/shared/rootEpic.ts`

### Adding neo4j-arc Components

1. Implement in `src/neo4j-arc/common/`, `graph-visualization/`, or `cypher-language-support/`
2. Do NOT import Redux, react-redux, or browser/shared code
3. Export via `src/neo4j-arc/index.ts`
4. Import in browser code using `neo4j-arc/common` alias

### Running Single Test File

```bash
yarn jest path/to/test.test.tsx
yarn jest path/to/test.test.tsx --watch
```

## Important Notes

- **Monaco Editor**: Never import `monaco-editor` directly; use the configured paths
- **ESLint**: The codebase uses both Babel and TypeScript parsers (see .eslintrc.json overrides)
- **Node Version**: Requires Node >= 20.19.0
- **Pre-commit**: Husky + lint-staged runs prettier-eslint on changed files
- **Neo4j Desktop Integration**: Configured via `neo4jDesktop` in package.json (API version ^1.4.0)

## Additional Documentation

- **BOLT Connection Architecture**: See `docs/BOLT_CONNECTION_ARCHITECTURE.md` for detailed documentation on neo4j-driver integration, connection lifecycle, Redux ducks, epics, workers, and improvement patterns.
