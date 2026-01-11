# Usage Patterns

**Purpose**: Common patterns for building and executing pipelines with `xenocline`.

## Basic Linear Pipeline

The simplest pipeline: sequential execution through multiple phases.

```typescript
import { 
    createPhase, createPhaseNode, createConnection, 
    createTermination, createProcess, createBeginning, 
    executeProcess 
} from '@girverket/xenocline';

// Define phases
const addOne = createPhase('AddOne', {
    execute: async (input) => {
        const value = (input as any).value;
        return { value: value + 1 };
    }
});

const multiplyByTwo = createPhase('MultiplyByTwo', {
    execute: async (input) => {
        const value = (input as any).value;
        return { value: value * 2 };
    }
});

// Create nodes with connections
const toNodeB = createConnection('conn1', 'nodeB');
const nodeA = createPhaseNode('nodeA', addOne, { next: [toNodeB] });

const endTermination = createTermination('end');
const nodeB = createPhaseNode('nodeB', multiplyByTwo, { next: endTermination });

// Build process
const process = createProcess('LinearProcess', {
    phases: { nodeA, nodeB }
});

// Execute
const beginning = createBeginning('nodeA', 'nodeA');
const [results, phaseResults, context] = await executeProcess(
    process,
    beginning,
    { input: { value: 10 } }
);

console.log('Final result:', results['end']); // { value: 22 }
```

## Branching Pipeline (Multiple End States)

Create pipelines that branch into multiple independent paths.

```typescript
// Define phases
const addOne = createPhase('AddOne', { /* ... */ });
const multiplyByTwo = createPhase('MultiplyByTwo', { /* ... */ });
const square = createPhase('Square', {
    execute: async (input) => {
        const value = (input as any).value;
        return { value: value * value };
    }
});

// Node A branches to both B and C
const toNodeB = createConnection('conn1', 'nodeB');
const toNodeC = createConnection('conn2', 'nodeC');
const nodeA = createPhaseNode('nodeA', addOne, { 
    next: [toNodeB, toNodeC]  // Fan-out: parallel execution
});

const end1 = createTermination('end1');
const nodeB = createPhaseNode('nodeB', multiplyByTwo, { next: end1 });

const end2 = createTermination('end2');
const nodeC = createPhaseNode('nodeC', square, { next: end2 });

const process = createProcess('BranchingProcess', {
    phases: { nodeA, nodeB, nodeC }
});

const [results, phaseResults, context] = await executeProcess(
    process,
    createBeginning('nodeA', 'nodeA'),
    { input: { value: 10 } }
);

console.log('Path 1 result:', results['end1']); // { value: 22 }
console.log('Path 2 result:', results['end2']); // { value: 121 }
```

## Conditional Execution with Decisions

Use Decisions to choose execution paths based on data.

```typescript
import { createDecision } from '@girverket/xenocline';

const addOne = createPhase('AddOne', { /* ... */ });
const multiplyByTwo = createPhase('MultiplyByTwo', { /* ... */ });
const stringify = createPhase('Stringify', { /* ... */ });

const nodeA = createPhaseNode('nodeA', addOne, { 
    next: [createConnection('conn1', 'nodeB')] 
});

// Decision after nodeB
const toNodeC = createConnection('conn2', 'nodeC');
const earlyEnd = createTermination('earlyEnd');
const decision = createDecision('decisionAtB', async (output, context) => {
    const value = (output as any).value;
    if (value > 15) {
        console.log('Value too large, terminating early');
        return earlyEnd;
    } else {
        console.log('Value acceptable, continuing to nodeC');
        return [toNodeC];
    }
});

const nodeB = createPhaseNode('nodeB', multiplyByTwo, { next: [decision] });

const normalEnd = createTermination('normalEnd');
const nodeC = createPhaseNode('nodeC', stringify, { next: normalEnd });

const process = createProcess('DecisionProcess', {
    phases: { nodeA, nodeB, nodeC }
});

// With value 10: (10+1)*2 = 22 > 15, terminates early
// With value 5: (5+1)*2 = 12 <= 15, continues to nodeC
```

## Aggregation Pattern

Combine outputs from multiple parallel paths using an AggregatorNode.

```typescript
import { createAggregator, createAggregatorNode } from '@girverket/xenocline';

const addOne = createPhase('AddOne', { /* ... */ });
const multiplyByTwo = createPhase('MultiplyByTwo', { /* ... */ });
const square = createPhase('Square', { /* ... */ });

// Aggregator that sums two inputs
let storage = { count: 0, sum: 0 };

const sumAggregator = createAggregator('SumAggregator', {
    aggregate: async (input) => {
        storage.count++;
        storage.sum += (input as any).value;
        
        if (storage.count === 2) {
            console.log('Both inputs received, outputting sum');
            return { 
                status: 'Ready', 
                output: { value: storage.sum } 
            };
        }
        
        console.log('Waiting for more inputs');
        return { status: 'NotYetReady' };
    }
});

// Fan-out from nodeA
const nodeA = createPhaseNode('nodeA', addOne, {
    next: [
        createConnection('conn1', 'nodeB'),
        createConnection('conn2', 'nodeC')
    ]
});

// Both paths lead to aggregator
const nodeB = createPhaseNode('nodeB', multiplyByTwo, {
    next: [createConnection('conn3', 'aggNode')]
});

const nodeC = createPhaseNode('nodeC', square, {
    next: [createConnection('conn4', 'aggNode')]
});

// Aggregator node waits for both inputs
const aggNode = createAggregatorNode('aggNode', sumAggregator, {
    next: createTermination('end')
});

const process = createProcess('AggregationProcess', {
    phases: { nodeA, nodeB, nodeC, aggNode }
});

// Input 10: (10+1)*2 + (10+1)^2 = 22 + 121 = 143
```

## Event Monitoring

Monitor execution with event handlers for logging and debugging.

```typescript
import { createEventHandler } from '@girverket/xenocline';

// Create a simple logging handler
const loggingHandler = createEventHandler(async (event, context) => {
    console.log(
        `[${event.type}:${event.stage}] ${event.sourceId}`
    );
});

// Execute with handler
const [results, phaseResults, context] = await executeProcess(
    process,
    beginning,
    { 
        input: { value: 10 },
        eventHandlers: [loggingHandler]
    }
);

// Output:
// [process:start] MyProcess
// [node:start] nodeA
// [phase:start] nodeA
// [phase:execute] nodeA
// [transition:start] conn1
// ...
```

## Filtered Event Handling

Use filters to handle specific events only.

```typescript
import { createEventFilter, createFilteredHandler } from '@girverket/xenocline';

// Filter for phase execution events only
const phaseExecuteFilter = createEventFilter({
    type: 'phase',
    stage: 'execute'
});

const phaseHandler = createEventHandler(async (event, context) => {
    console.log(`Phase ${event.sourceId} executed`);
});

const filteredHandler = createFilteredHandler(phaseExecuteFilter, phaseHandler);

// Or monitor specific node
const nodeAFilter = createEventFilter({
    sourceId: 'nodeA'
});

const nodeAHandler = createFilteredHandler(
    nodeAFilter,
    createEventHandler(async (event) => {
        console.log('NodeA event:', event.stage);
    })
);

await executeProcess(process, beginning, {
    input: data,
    eventHandlers: [filteredHandler, nodeAHandler]
});
```

## Input Validation with Verify

Use the verify method to validate inputs before execution.

```typescript
const validatedPhase = createPhase('ValidatedPhase', {
    verify: async (input) => {
        const value = (input as any).value;
        if (typeof value !== 'number') {
            return {
                verified: false,
                messages: ['Input value must be a number']
            };
        }
        if (value < 0) {
            return {
                verified: false,
                messages: ['Input value must be non-negative']
            };
        }
        return { verified: true, messages: [] };
    },
    execute: async (input) => {
        // Input is guaranteed valid here
        return { value: (input as any).value * 2 };
    }
});
```

## Context Manipulation with Prepare/Process Hooks

Use prepare and process hooks to modify data and context during execution.

```typescript
interface MyContext extends Context {
    executionLog: string[];
    config: { multiplier: number };
}

const nodeWithHooks = createPhaseNode<Input, Output, MyContext>(
    'myNode',
    myPhase,
    {
        prepare: async (input, context) => {
            // Modify input before phase execution
            const modifiedInput = { ...input, timestamp: Date.now() };
            
            // Update context
            context.executionLog.push('Preparing myNode');
            
            return [modifiedInput, context];
        },
        process: async (output, context) => {
            // Modify output after phase execution
            const modifiedOutput = {
                ...output,
                multiplied: (output as any).value * context.config.multiplier
            };
            
            // Update context
            context.executionLog.push('Processed myNode');
            
            return [modifiedOutput, context];
        }
    }
);

const [results, phaseResults, finalContext] = await executeProcess(
    process,
    beginning,
    {
        input: data,
        executionLog: [],
        config: { multiplier: 3 }
    }
);

console.log('Execution log:', (finalContext as MyContext).executionLog);
```

## Type-Safe Pipelines

Define strict types for inputs, outputs, and context.

```typescript
interface NumberInput extends Input {
    value: number;
}

interface StringOutput extends Output {
    result: string;
}

interface AppContext extends Context {
    config: {
        prefix: string;
    };
}

const typedPhase = createPhase<NumberInput, StringOutput>('TypedPhase', {
    execute: async (input: NumberInput): Promise<StringOutput> => {
        return { result: input.value.toString() };
    }
});

const typedNode = createPhaseNode<NumberInput, StringOutput, AppContext>(
    'typedNode',
    typedPhase,
    {
        process: async (output, context) => {
            return [
                { result: context.config.prefix + output.result },
                context
            ];
        }
    }
);

// TypeScript ensures type safety throughout
const [results, phaseResults, context] = await executeProcess<NumberInput, AppContext>(
    process,
    createBeginning<NumberInput, AppContext>('typedNode', 'typedNode'),
    {
        input: { value: 42 },
        config: { prefix: 'Result: ' }
    }
);
```

## Error Handling

Handle errors gracefully in phases and hooks.

```typescript
const errorPronePhase = createPhase('ErrorProne', {
    execute: async (input) => {
        try {
            // Risky operation
            const result = await riskyOperation(input);
            return { success: true, data: result };
        } catch (error) {
            // Return error in output rather than throwing
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error' 
            };
        }
    }
});

// Or use a decision to handle errors
const errorCheckDecision = createDecision('errorCheck', async (output) => {
    if ((output as any).success) {
        return [createConnection('success', 'successNode')];
    } else {
        return [createConnection('error', 'errorHandlerNode')];
    }
});
```

## Reusable Phase Libraries

Create libraries of reusable phases.

```typescript
// phases/math.ts
export const createAddPhase = (amount: number) => createPhase('Add', {
    execute: async (input) => {
        return { value: (input as any).value + amount };
    }
});

export const createMultiplyPhase = (factor: number) => createPhase('Multiply', {
    execute: async (input) => {
        return { value: (input as any).value * factor };
    }
});

// Usage
import { createAddPhase, createMultiplyPhase } from './phases/math';

const add5 = createAddPhase(5);
const multiply3 = createMultiplyPhase(3);

const nodeA = createPhaseNode('nodeA', add5, { /* ... */ });
const nodeB = createPhaseNode('nodeB', multiply3, { /* ... */ });
```

