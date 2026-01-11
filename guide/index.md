# AI Agent Guide: xenocline

**Role**: You are an AI assistant tasked with understanding, integrating, or extending `xenocline` processor pipeline capabilities in applications.

**Goal**: Provide a comprehensive understanding of `xenocline`'s capabilities, architecture, and usage patterns to facilitate correct implementation and extension.

## Core Capabilities

`xenocline` is a modular framework for TypeScript/Node.js that manages and executes **Processor Pipelines**—sequences of computational steps or tasks executed systematically to process data or events.

*   **Pipeline Execution**: Define and orchestrate sequences of processors (phases) into efficient workflows.
*   **Modular Architecture**: Easy plug-and-play processors to extend or modify pipeline behavior.
*   **Graph-Based Flows**: Support for branching, multiple end states, and conditional decision points.
*   **Aggregation**: Combine outputs from multiple parallel processing paths using AggregatorNodes.
*   **Event System**: Monitor pipeline execution with event handlers for logging, debugging, and custom reactions.
*   **Type-Safe**: Written in TypeScript with comprehensive type definitions for inputs, outputs, and context.
*   **Concurrent Execution**: Supports parallel execution paths (fan-out) for improved performance.

## Quick Start Context

When analyzing or generating code using `xenocline`, keep these patterns in mind:

1.  **Define Phases**: Create Phase objects with `createPhase()` containing execute logic.
2.  **Create Nodes**: Wrap phases in PhaseNodes using `createPhaseNode()` with connections.
3.  **Build Process**: Assemble nodes into a Process with `createProcess()`.
4.  **Execute**: Run the pipeline with `executeProcess()` passing a Beginning and initial input.

```typescript
import { 
    createPhase, createPhaseNode, createConnection, 
    createTermination, createProcess, createBeginning, 
    executeProcess 
} from '@girverket/xenocline';

// Define a phase
const addOnePhase = createPhase('AddOne', {
    execute: async (input) => {
        const value = (input as any).value;
        return { value: value + 1 };
    }
});

// Create nodes and connections
const toEndConnection = createConnection('conn1', 'end');
const nodeA = createPhaseNode('nodeA', addOnePhase, { 
    next: [toEndConnection] 
});

const endTermination = createTermination('end');

// Create process
const process = createProcess('SimpleProcess', {
    phases: { nodeA, end: endTermination }
});

// Execute
const beginning = createBeginning('nodeA', 'nodeA');
const [results, phaseResults, context] = await executeProcess(
    process, 
    beginning, 
    { input: { value: 10 } }
);
```

## Documentation Structure

This guide directory contains specialized documentation for different aspects of the system:

*   [Configuration](./configuration.md): Details on process configuration, context management, and execution options.
*   [Usage Patterns](./usage.md): Common patterns for building pipelines, branching, decisions, and aggregation.
*   [Architecture](./architecture.md): Internal design, module structure, and data flow.
*   [Development](./development.md): Guide for contributing to `xenocline` itself.

