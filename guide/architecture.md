# Architecture

**Purpose**: High-level overview of the internal design of `xenocline`.

## Module Structure

The project is organized into distinct logical modules:

*   **`src/xenocline.ts`**: Main entry point exposing all public APIs, factory functions, and type exports.
*   **`src/process.ts`**: Process definition and validation. A Process contains a collection of nodes (phases) that form the pipeline.
*   **`src/phase.ts`**: Phase interface and creation. Phases are the individual computational units with execute and optional verify methods.
*   **`src/node/`**: Node implementations:
    *   **`node.ts`**: Base Node interface and validation.
    *   **`phasenode.ts`**: PhaseNode wraps a Phase with optional prepare/process hooks and transitions (next).
    *   **`aggregatornode.ts`**: AggregatorNode for combining multiple inputs before proceeding.
*   **`src/transition/`**: Transition types that define how execution flows between nodes:
    *   **`connection.ts`**: Simple Connection from one node to another.
    *   **`decision.ts`**: Decision that evaluates output and context to choose next transition(s) or termination.
    *   **`termination.ts`**: Termination represents an end state in the pipeline.
    *   **`beginning.ts`**: Beginning defines the starting node and entry point for execution.
*   **`src/execution/`**: Execution engine:
    *   **`process.ts`**: Core logic for executing a process. Handles node traversal, concurrency, and result aggregation.
    *   **`event.ts`**: Event state management and dispatching logic.
*   **`src/event/`**: Event types and creators:
    *   **`event.ts`**: Base Event interface.
    *   **`handler.ts`**: EventHandler interface and creation.
    *   **`process.ts`, `node.ts`, `phase.ts`, `aggregator.ts`, `transition.ts`**: Specific event types for different stages.
*   **`src/aggregator.ts`**: Aggregator interface for combining multiple inputs into a single output.
*   **`src/context.ts`**: Context type representing shared state throughout execution.
*   **`src/input.ts`, `src/output.ts`**: Type definitions for data flowing through the pipeline.
*   **`src/utility/`**: Utility functions for event filtering and handler composition.
*   **`src/util/`**: General utility functions (e.g., object cleaning).

## Data Flow

1.  **Process Definition**: User defines Phases, creates PhaseNodes/AggregatorNodes, and connects them into a Process.
2.  **Execution Start**: `executeProcess()` is called with a Process, Beginning, and initial Context (containing input and optional event handlers).
3.  **Beginning Transition**: Execution starts at the node specified by the Beginning.
4.  **Node Execution**:
    *   **PhaseNode**:
        *   Optional `prepare()` method runs first, allowing input/context modification.
        *   Phase's optional `verify()` method checks input validity.
        *   Phase's `execute()` method performs the core computation.
        *   Optional `process()` method runs after execution, allowing output/context modification.
    *   **AggregatorNode**:
        *   `aggregate()` method is called for each incoming input.
        *   Returns `NotYetReady` until all expected inputs arrive.
        *   Returns `Ready` with aggregated output when complete.
5.  **Transition Resolution**:
    *   Node's `next` property determines the next step.
    *   Can be a Termination, an array of Connections, or a Decision.
    *   Decision evaluates the output and context to dynamically choose next transition(s) or termination.
6.  **Parallel Execution**: If multiple Connections are specified, execution branches (fan-out) and nodes execute concurrently.
7.  **Aggregation**: AggregatorNodes wait for all incoming paths to complete before proceeding.
8.  **Termination**: When a Termination is reached, that branch of execution ends. Process completes when all branches terminate.
9.  **Results**: Returns ProcessResults (outputs at termination points), PhaseResults (outputs at each node), and final Context.

## Design Decisions

*   **Immutability**: All core objects (Phase, Node, Process, Transition) are created as immutable (Readonly) to prevent accidental modification.
*   **Factory Functions**: Use factory functions (`createPhase`, `createProcess`, etc.) rather than classes for simpler composition and testing.
*   **Type Guards**: Every core type has an `is*()` function (e.g., `isPhase`, `isProcess`) for runtime type checking.
*   **Validation**: Comprehensive validation functions (`validate*`) for each type to ensure pipeline integrity before execution.
*   **Event-Driven**: Optional event system allows monitoring without coupling core execution logic to logging/debugging.
*   **Generic Types**: Extensive use of TypeScript generics for Input, Output, and Context types allows type-safe pipelines.
*   **Async/Await**: All execution is asynchronous, enabling I/O-bound operations and concurrent processing.
*   **Context Sharing**: Shared Context object flows through execution, but with concurrency warnings for parallel paths.

## Key Dependencies

*   **`@doccident/doccident`**: Documentation validation for README examples.
*   **`vitest`**: Testing framework.
*   **`vite`**: Build tool.
*   **`typescript`**: Type system and compiler.
*   **`eslint`**: Code linting.

## Concurrency Model

*   **Fan-Out**: When a node has multiple Connections in its `next` array, those paths execute in parallel.
*   **Fan-In**: AggregatorNodes provide synchronization points where multiple parallel paths converge.
*   **Context Mutation**: Parallel nodes receive and can modify the shared context. This can lead to race conditions if not designed carefully. Best practice is to use unique context keys per execution path or ensure modifications are idempotent.

