# Development Guide

**Purpose**: Instructions for contributing to and developing `xenocline`.

## Setup

1.  **Clone Repository**: `git clone https://github.com/girverket/xenocline.git`
2.  **Install Dependencies**: `npm install`
3.  **Build**: `npm run build`

## Project Structure

```
xenocline/
├── src/                    # TypeScript source files
│   ├── xenocline.ts        # Main entry point with exports
│   ├── process.ts          # Process definition
│   ├── phase.ts            # Phase definition
│   ├── aggregator.ts       # Aggregator definition
│   ├── node/               # Node implementations
│   ├── transition/         # Transition types
│   ├── execution/          # Execution engine
│   ├── event/              # Event system
│   ├── utility/            # Utility functions
│   └── util/               # General utilities
├── tests/                  # Test files (mirrors src structure)
├── dist/                   # Compiled output
├── coverage/               # Test coverage reports
└── package.json            # Package configuration
```

## Testing

We use **Vitest** for testing with comprehensive coverage requirements.

*   **Run Tests**: `npm test` (runs coverage + README validation)
*   **Coverage Only**: `npm run test:coverage`
*   **README Validation**: `npm run test:readme` (validates code examples using doccident)
*   **Watch Mode**: `npx vitest --watch`

### Testing Strategy

*   **Unit Tests**: Each module has corresponding tests in `tests/`. Tests mirror the source structure (e.g., `src/phase.ts` → `tests/phase.test.ts`).
*   **Example Tests**: Complex examples are tested in `tests/example*.test.ts` files, ensuring README examples work correctly.
*   **Coverage Target**: Aim for high coverage (90%+). Coverage reports are generated in `coverage/`.
*   **Mock Strategy**: Tests use `__mocks__/` for mocking execution behavior when needed.

### Writing Tests

Follow existing patterns:

```typescript
import { describe, it, expect } from 'vitest';
import { createPhase, isPhase } from '../src/phase';

describe('createPhase', () => {
    it('should create a phase with execute function', () => {
        const phase = createPhase('TestPhase', {
            execute: async (input) => ({ result: 'ok' })
        });
        
        expect(phase.name).toBe('TestPhase');
        expect(isPhase(phase)).toBe(true);
    });
});
```

## Linting & Formatting

*   **Lint**: `npm run lint`
*   **Fix**: `npm run lint:fix`

We use **ESLint** with TypeScript rules. Configuration is in `eslint.config.mjs` (Flat Config format).

### Linting Rules

*   Strict TypeScript checks
*   Import ordering and organization
*   No unused variables or imports
*   Consistent code style

## Build System

The project uses **Vite** for building:

*   **Build**: `npm run build`
*   **Watch Mode**: `npm run watch`
*   **Clean**: `npm run clean` (removes dist directory)

Build outputs:

*   `dist/xenocline.js` - ES Module
*   `dist/xenocline.cjs` - CommonJS Module
*   `dist/xenocline.d.ts` - TypeScript declarations
*   `dist/**/*.d.ts` - Individual type declarations

## Release Process

1.  **Update Version**: Increment version in `package.json` following semantic versioning.
2.  **Run Pre-commit**: `npm run precommit` (builds, lints, and tests)
3.  **Commit Changes**: Commit with descriptive message.
4.  **Tag Release**: `git tag v0.0.X`
5.  **Push**: `git push && git push --tags`
6.  **Publish**: `npm publish` (requires authentication)

### Pre-publish Checks

The `prepublishOnly` script runs automatically and ensures:
*   Linting passes
*   Build succeeds
*   All tests pass
*   README examples are valid

## Adding Features

### Adding a New Transition Type

1.  Create file in `src/transition/` (e.g., `newtransition.ts`)
2.  Define interface extending `Transition`
3.  Implement `create*`, `is*`, and `validate*` functions
4.  Add event type in `src/event/transition.ts`
5.  Update execution logic in `src/execution/process.ts`
6.  Export from `src/xenocline.ts`
7.  Write tests in `tests/transition/`
8.  Update type definitions

### Adding a New Node Type

1.  Create file in `src/node/` (e.g., `customnode.ts`)
2.  Define interface extending `Node`
3.  Implement factory, type guard, and validation functions
4.  Add event type in `src/event/node.ts`
5.  Update execution engine to handle new node type
6.  Export from `src/xenocline.ts`
7.  Write comprehensive tests
8.  Document in README and guide

### Adding a New Event Type

1.  Define event interface in appropriate `src/event/*.ts` file
2.  Create event factory function
3.  Add event type guard
4.  Dispatch event in execution engine at appropriate stage
5.  Update event filter utilities if needed
6.  Test event emission
7.  Document event schema

## Code Style Guidelines

1.  **Types First**: Define interfaces before implementations.
2.  **Factory Functions**: Use factory functions (e.g., `createPhase`) instead of classes.
3.  **Type Guards**: Every public type should have an `is*()` function.
4.  **Validation**: Complex types should have `validate*()` functions.
5.  **Immutability**: Use `Readonly<>` for configuration objects.
6.  **Generics**: Use generics for flexible, type-safe APIs.
7.  **Async**: All public execution APIs should be async.
8.  **Documentation**: Use TSDoc comments for public APIs.

## Debugging

*   **Event Handlers**: Add event handlers during development to trace execution:

```typescript
const debugHandler = createEventHandler(async (event, context) => {
    console.log(event.type, event.stage, event.sourceId);
});

await executeProcess(process, beginning, { 
    input: data, 
    eventHandlers: [debugHandler] 
});
```

*   **Validation**: Use validation functions to catch configuration errors:

```typescript
import { validateProcess } from '@girverket/xenocline';

const errors = validateProcess(myProcess);
if (errors.length > 0) {
    console.error('Process validation errors:', errors);
}
```

## Contributing

1.  Fork the repository
2.  Create a feature branch
3.  Make changes following code style guidelines
4.  Add/update tests
5.  Run `npm run precommit` to verify
6.  Submit pull request with clear description

## Documentation

*   **README**: High-level overview and examples
*   **Guide**: This directory contains detailed documentation
*   **TSDoc**: Inline documentation in source code
*   **Examples**: Example tests serve as working documentation

