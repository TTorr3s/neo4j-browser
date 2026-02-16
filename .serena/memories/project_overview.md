# Neo4j Browser - Project Overview

## Purpose
Neo4j Browser is a React-based GUI for Neo4j databases (version 3.0.0). It connects to Neo4j via the neo4j-driver (bolt protocol) to execute Cypher queries and visualize graph data.

## Tech Stack
- **React 18.2.0** with functional components and hooks (no class components)
- **TypeScript 4.9.5** (strict mode)
- **Redux 4.2.1** + **Redux-Observable 2.0.0** (RxJS 7.8.1) for state management
- **@reduxjs/toolkit 2.11.1**
- **styled-components 5.3.3** for styling
- **Monaco Editor 0.55.0** for Cypher code editing
- **D3 v3** for graph visualization
- **neo4j-driver 6.0.1** for database connectivity
- **Webpack 5.95.0** for bundling
- **SWC 1.15+** for transpilation (not Babel/ts-loader)
- **Jest 29.7.0** + **@swc/jest** for unit testing
- **Cypress 13.17.0** for E2E testing
- **Node >= 22.0.0** (nvm config: 24.13.0)
- **Yarn** as package manager

## Architecture
The codebase follows a Redux + Redux-Observable (epics) architecture with the "duck" pattern for modules.

### Directory Structure
```
src/
├── browser/           # UI components and browser-specific modules
│   ├── modules/       # Feature modules (App, Frame, Stream, Sidebar, Editor, D3Visualization, etc.)
│   ├── components/    # Shared React components
│   ├── hooks/         # Custom React hooks (useBus, etc.)
│   ├── styles/        # Global styles
│   └── images/        # Static images
├── shared/            # Shared business logic
│   ├── modules/       # Redux ducks (connections, commands, cypher, dbMeta, settings, frames, etc.)
│   ├── services/      # Shared services (bolt, localstorage, etc.)
│   ├── utils/         # Utility functions
│   ├── rootReducer.ts # Combined reducers
│   └── rootEpic.ts    # Combined epics
└── neo4j-arc/         # Isolated reusable component library (strict import rules)
    ├── common/        # Shared utilities
    ├── graph-visualization/  # D3 graph rendering
    └── cypher-language-support/ # Monaco Cypher editor support
```

### Path Aliases (tsconfig.json & .swcrc)
- `services/*` → `shared/services/*`
- `browser-services/*` → `browser/services/*`
- `browser-components/*` → `browser/components/*`
- `browser-hooks/*` → `browser/hooks/*`
- `browser-styles/*` → `browser/styles/*`
- `icons/*` → `browser/icons/*`
- `project-root/*` → `../*`
- `neo4j-arc/graph-visualization`, `neo4j-arc/common`, `neo4j-arc/cypher-language-support`

### neo4j-arc Isolation Rules
- Cannot import from `browser/*`, `shared/*`, or `services/*`
- Cannot use Redux, react-redux, or react-suber
- Browser/shared code must import via aliases (e.g., `neo4j-arc/common`)

### Duck Pattern (Redux Modules)
Each module in `src/shared/modules/` follows the duck pattern:
- Action type constants (e.g., `connections/SET_ACTIVE`)
- Action creators
- Reducer (default export)
- Epics (for async operations via RxJS)

### Key Flows
- **Connection**: connectionsDuck → connectEpic → neo4j-driver → dbMetaEpic → schema fetch
- **Commands**: Editor → commandsDuck → cypherDuck → neo4j-driver → framesDuck (results)
- **Event Bus**: react-suber (`useBus` hook) for component communication
