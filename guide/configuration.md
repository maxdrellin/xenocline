# Configuration Reference

**Purpose**: Detailed guide on configuring `xenocline` processes and execution.

## Configuration Approach

Unlike traditional configuration-file-driven libraries, `xenocline` uses **programmatic configuration** through factory functions and options objects. There are no environment variables or configuration files to manage. Instead, you configure pipelines directly in code.

## Process Configuration

The Process is the top-level container for your pipeline.

```typescript
interface ProcessOptions {
    phases: Record<string, PhaseNode | AggregatorNode>;
}

const process = createProcess(name: string, options: Partial<ProcessOptions>);
```

*   **name**: Identifier for the process (used in events and debugging).
*   **phases**: Object mapping node IDs to PhaseNode or AggregatorNode instances.

## Phase Configuration

Phases define the computational units.

```typescript
interface PhaseOptions<T extends Input, U extends Output> {
    execute: ExecuteMethod<T, U>;
    verify?: VerifyMethod<T>;
}

const phase = createPhase<T, U>(name: string, options: Partial<PhaseOptions<T, U>>);
```

*   **name**: Identifier for the phase.
*   **execute**: Required async function that processes input and returns output.
*   **verify**: Optional async function that validates input before execution.

## Node Configuration

### PhaseNode Configuration

PhaseNodes wrap phases and define transitions.

```typescript
interface PhaseNodeOptions<I extends Input, O extends Output, C extends Context> {
    next?: Next<O, C>;
    prepare?: PrepareMethod<I, C>;
    process?: ProcessMethod<O, C>;
}

const node = createPhaseNode<I, O, C>(
    id: string, 
    phase: Phase<I, O>, 
    options?: Partial<PhaseNodeOptions<I, O, C>>
);
```

*   **id**: Unique identifier for the node within the process.
*   **phase**: The Phase instance to execute.
*   **next**: Defines what happens after execution (Connections, Decision, or Termination).
*   **prepare**: Optional hook called before phase execution to modify input/context.
*   **process**: Optional hook called after phase execution to modify output/context.

### AggregatorNode Configuration

AggregatorNodes combine multiple inputs.

```typescript
interface AggregatorNodeOptions<O extends Output, C extends Context> {
    next?: Next<O, C>;
}

const node = createAggregatorNode<I, O, C>(
    id: string,
    aggregator: Aggregator<I, O>,
    options?: Partial<AggregatorNodeOptions<O, C>>
);
```

*   **id**: Unique identifier for the aggregator node.
*   **aggregator**: Aggregator instance that combines inputs.
*   **next**: Transition after aggregation completes.

## Transition Configuration

### Connection

Simple transition from one node to another.

```typescript
const connection = createConnection(id: string, targetNodeId: string);
```

### Decision

Conditional transition based on output and context.

```typescript
const decision = createDecision<O, C>(
    id: string,
    decide: (output: O, context: C) => Promise<Termination | Connection[]>
);
```

### Termination

End state for a pipeline branch.

```typescript
const termination = createTermination(
    id: string, 
    options?: { terminate?: (output: Output) => Promise<Output> }
);
```

*   **id**: Identifier for this end state (used in results).
*   **terminate**: Optional hook to transform final output.

### Beginning

Entry point for execution.

```typescript
const beginning = createBeginning<I, C>(id: string, targetNodeId: string);
```

## Execution Configuration

The `executeProcess` function accepts a context with execution options.

```typescript
interface Context {
    input?: Input;
    eventHandlers?: EventHandler[];
    [key: string]: any; // Custom context data
}

const [results, phaseResults, context] = await executeProcess<I, C>(
    process: Process,
    beginning: Beginning<I, C>,
    context: C
);
```

*   **input**: Initial input data for the pipeline.
*   **eventHandlers**: Array of event handlers for monitoring execution.
*   **Custom Properties**: Add any additional data needed throughout execution.

## Event Handler Configuration

Event handlers monitor execution without modifying it.

```typescript
const handler = createEventHandler(
    async (event: Event, context: Context) => {
        // Handle event (logging, metrics, etc.)
    }
);
```

You can filter events using utility functions:

```typescript
import { createEventFilter, createFilteredHandler } from '@girverket/xenocline';

const filter = createEventFilter({
    type: 'phase',
    stage: 'execute',
    sourceId: 'myPhase'
});

const filteredHandler = createFilteredHandler(filter, handler);
```

## Context Management

The Context object is shared across all nodes during execution:

*   **Initial Context**: Provided to `executeProcess()`.
*   **Modifications**: PhaseNode `prepare` and `process` hooks can modify context.
*   **Concurrency Warning**: In parallel execution paths, multiple nodes may modify context simultaneously. Use unique keys or careful synchronization.

## Type Configuration

Use TypeScript generics to enforce type safety:

```typescript
interface MyInput extends Input {
    value: number;
}

interface MyOutput extends Output {
    result: string;
}

interface MyContext extends Context {
    config: { timeout: number };
}

const phase = createPhase<MyInput, MyOutput>('MyPhase', {
    execute: async (input: MyInput): Promise<MyOutput> => {
        return { result: input.value.toString() };
    }
});

const node = createPhaseNode<MyInput, MyOutput, MyContext>(
    'myNode',
    phase,
    {
        prepare: async (input, context) => {
            console.log('Timeout:', context.config.timeout);
            return [input, context];
        }
    }
);
```

## Best Practices

1.  **Type Safety**: Always define Input/Output/Context interfaces for your pipelines.
2.  **Node IDs**: Use descriptive, unique IDs for nodes and connections.
3.  **Validation**: Call `validateProcess()` during development to catch configuration errors early.
4.  **Event Handlers**: Use filtered handlers for specific monitoring needs to reduce noise.
5.  **Context Keys**: Use namespaced keys in context (e.g., `myApp.config`) to avoid collisions.
6.  **Immutability**: Remember that all configuration objects are immutable—modifications require creating new instances.

