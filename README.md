Xenocline, as a library focused on creating a system to execute a **Processor Pipeline**, can be described as follows:

**Xenocline** provides a streamlined, modular framework to manage and execute **Processor Pipelines**—sequences of computational steps or tasks executed systematically to process data or events. It allows developers to define, connect, and orchestrate individual processors into efficient workflows, supporting clear separation of concerns, scalability, and ease of maintenance.

### Core Concepts:

1. **Processor**:
   Individual computational unit responsible for a specific, well-defined operation (e.g., parsing data, validating inputs, transforming records).

2. **Pipeline**:
   A structured sequence or graph of processors, allowing data or events to flow through multiple processing stages seamlessly.

3. **Execution Engine**:
   Manages the lifecycle of processors within a pipeline, coordinating initialization, execution order, concurrency, error handling, and resource management.

4. **Pipeline Definition**:
   Clear, configurable declarations for how processors interact, ensuring pipelines are easy to define, understand, modify, and debug.

### Why Xenocline?

* **Modularity**: Easy plug-and-play processors to extend or modify pipeline behavior.
* **Robustness**: Handles complex execution scenarios with built-in error handling and resource management.
* **Scalability**: Designed for high performance, enabling parallel execution and efficient handling of large-scale processing.
* **Developer-friendly**: Clean, intuitive APIs for building and managing pipelines.

This architecture makes **Xenocline** ideal for applications like data transformation, event handling, ETL (Extract, Transform, Load) processes, middleware orchestration, and automation workflows—anywhere a structured pipeline execution model is advantageous.

### Example Usage

Here's a conceptual example in TypeScript demonstrating how to define and execute a basic Xenocline process. This simple pipeline takes a number, adds one, multiplies by two, and then converts the result to a string.

```js
import { Input, Output, PhaseNode, Process, Phase, executeProcess, Context, ProcessResults, PhaseResults, Termination, createPhase, createPhaseNode, createConnection, createTermination, createProcess, Beginning, createBeginning } from '@maxdrellin/xenocline';

// --- 1. Define Concrete Phase Implementations ---

// Phase 1: Adds 1 to the input number
const addOneExecute = async (input: Input): Promise<Output> => {
    // Assuming input has a 'value' property for this example
    const inputValue = (input as any).value;
    console.log(`AddOnePhase: Received ${inputValue}`);
    const result = inputValue + 1;
    console.log(`AddOnePhase: Outputting ${result}`);
    return { value: result };
}
const addOnePhase: Phase = createPhase('AddOne', { execute: addOneExecute });

// Phase 2: Multiplies the input number by 2
const multiplyByTwoExecute = async (input: Input): Promise<Output> => {
    const inputValue = (input as any).value;
    console.log(`MultiplyByTwoPhase: Received ${inputValue}`);
    const result = inputValue * 2;
    console.log(`MultiplyByTwoPhase: Outputting ${result}`);
    return { value: result };
}
const multiplyByTwoPhase: Phase = createPhase('MultiplyByTwo', { execute: multiplyByTwoExecute });

// Phase 3: Converts the number to a string
const stringifyExecute = async (input: Input): Promise<Output> => {
    const inputValue = (input as any).value;
    console.log(`StringifyPhase: Received ${inputValue}`);
    const result = `The final number is: ${inputValue}`;
    console.log(`StringifyPhase: Outputting "${result}"`);
    return { value: result };
}
const stringifyPhase: Phase = createPhase('Stringify', { execute: stringifyExecute });

// --- 2. Instantiate Phases (already defined as objects) ---
// No explicit instantiation step needed like with classes,
// addOnePhase, multiplyByTwoPhase, and stringifyPhase are ready to be used.

// --- 3. Define PhaseNodes ---
const toNodeBConnection = createConnection('conn1', 'nodeB');
const nodeA: PhaseNode = createPhaseNode(
    'nodeA',
    addOnePhase,
    { next: [toNodeBConnection] }
);

const toNodeCConnection = createConnection('conn2', 'nodeC');
const nodeB: PhaseNode = createPhaseNode(
    'nodeB',
    multiplyByTwoPhase,
    { next: [toNodeCConnection] }
);

const endTermination = createTermination('end', { terminate: async (output: Output) => output });
const nodeC: PhaseNode = createPhaseNode('nodeC', stringifyPhase, { next: endTermination });

const phases = {
    nodeA: nodeA,
    nodeB: nodeB,
    nodeC: nodeC,
};

// --- 4. Define the Process ---
const mySimpleProcess: Process = createProcess(
    'MySimpleProcess',
    {
        phases: phases,
    }, // Add any relevant context
);

// --- 5. Execute the Process ---
async function runExample() {
    const initialProcessInput: Input = { value: 10 }; // Generic input
    console.log(
        `Executing process "${mySimpleProcess.name}" with initial input:`,
        initialProcessInput
    );

    try {
        const beginning: Beginning<Input, Context> = createBeginning('nodeA', 'nodeA');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(
            mySimpleProcess,
            beginning,
            { input: initialProcessInput }
        );

        console.log("\nProcess Execution Results:");
        for (const nodeId in phaseResults) {
            console.log(`Output from ${nodeId}:`, phaseResults[nodeId]);
        }

        // Example: Accessing a specific end phase result
        if (results['end']) {
            console.log("\nFinal output from StringifyPhase (nodeC):", (results['end'] as any).value);
        }

    } catch (error) {
        console.error("\nError during process execution:", error);
    }
}

// Run the example
runExample();

// 'Executing process "MySimpleProcess" with initial input:', { value: 10 });
// 'AddOnePhase: Received 10');
// 'AddOnePhase: Outputting 11');
// 'MultiplyByTwoPhase: Received 11');
// 'MultiplyByTwoPhase: Outputting 22');
// 'StringifyPhase: Received 22');
// 'StringifyPhase: Outputting "The final number is: 22"');
// '\nProcess Execution Results:');
// 'Output from nodeA:', { value: 11 });
// 'Output from nodeB:', { value: 22 });
// 'Output from nodeC:', { value: 'The final number is: 22' });
// '\nFinal output from StringifyPhase (nodeC):', 'The final number is: 22');
```

### Creating a Process with Multiple End States

This example illustrates how to configure a Xenocline process that can lead to multiple distinct end states. We'll demonstrate this by having an initial phase node branch its output to two subsequent, independent processing paths, each culminating in a unique result.

```js
import { Input, Output, PhaseNode, Process, Phase, executeProcess, Context, ProcessResults, PhaseResults, Termination, Connection, createConnection, createTermination, createProcess, createPhase, createPhaseNode, Beginning, createBeginning } from '@maxdrellin/xenocline';

// --- 1. Define Concrete Phase Implementations ---

// Phase 1: Adds 1 to the input number
const addOnePhase: Phase = createPhase('AddOne', {
    execute: async (input: Input): Promise<Output> => {
        // Assuming input has a 'value' property for this example
        const inputValue = (input as any).value;
        console.log(`AddOnePhase: Received ${inputValue}`);
        const result = inputValue + 1;
        console.log(`AddOnePhase: Outputting ${result}`);
        return { value: result };
    }
});

// Phase 2: Multiplies the input number by 2
const multiplyByTwoPhase: Phase = createPhase('MultiplyByTwo', {
    execute: async (input: Input): Promise<Output> => {
        const inputValue = (input as any).value;
        console.log(`MultiplyByTwoPhase: Received ${inputValue}`);
        const result = inputValue * 2;
        console.log(`MultiplyByTwoPhase: Outputting ${result}`);
        return { value: result };
    }
});

// Phase 3: Converts the number to a string
const stringifyPhase: Phase = createPhase('Stringify', {
    execute: async (input: Input): Promise<Output> => {
        const inputValue = (input as any).value;
        console.log(`StringifyPhase: Received ${inputValue}`);
        const result = `The final number is: ${inputValue}`;
        console.log(`StringifyPhase: Outputting "${result}"`);
        return { value: result };
    }
});

// Phase 4: Squares the input number
const squarePhase: Phase = createPhase('Square', {
    execute: async (input: Input): Promise<Output> => {
        const inputValue = (input as any).value;
        console.log(`SquarePhase: Received ${inputValue}`);
        const result = inputValue * inputValue;
        console.log(`SquarePhase: Outputting ${result}`);
        return { value: result };
    }
});

// --- 2. Instantiate Phases (already defined as objects) ---
// No explicit instantiation step needed like with classes,
// addOnePhase, multiplyByTwoPhase, and stringifyPhase are ready to be used.
// squarePhase is also ready.

// --- 3. Define PhaseNodes ---
const toNodeBConnection: Connection = createConnection('conn1', 'nodeB');
const toNodeDConnection: Connection = createConnection('conn3', 'nodeD');
const nodeA: PhaseNode = createPhaseNode('nodeA', addOnePhase, { next: [toNodeBConnection, toNodeDConnection] });

const toNodeCConnection: Connection = createConnection('conn2', 'nodeC');
const nodeB: PhaseNode = createPhaseNode('nodeB', multiplyByTwoPhase, { next: [toNodeCConnection] });

const endTermination: Termination = createTermination('end');
const nodeC: PhaseNode = createPhaseNode('nodeC', stringifyPhase, { next: endTermination });

const end2Termination: Termination = createTermination('end2');
const nodeD: PhaseNode = createPhaseNode('nodeD', squarePhase, { next: end2Termination });

// --- 4. Define the Process ---
const mySimpleProcess: Process = createProcess('MySimpleProcess', {
    phases: {
        nodeA: nodeA,
        nodeB: nodeB,
        nodeC: nodeC,
        nodeD: nodeD,
    },
});

// --- 5. Execute the Process ---
async function runExample() {
    const initialProcessInput: Input = { value: 10 }; // Generic input
    console.log(
        `Executing process "${mySimpleProcess.name}" with initial input:`,
        initialProcessInput
    );

    try {
        const beginning: Beginning<Input, Context> = createBeginning('nodeA', 'nodeA');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(
            mySimpleProcess,
            beginning,
            { input: initialProcessInput }
        );
        console.log("\nProcess Execution Results:");
        for (const nodeId in phaseResults) {
            console.log(`Output from ${nodeId}:`, phaseResults[nodeId]);
        }

        // Example: Accessing a specific end phase result
        if (results['end']) {
            console.log("\nFinal output from StringifyPhase (nodeC):", (results['end'] as any).value);
        }
        if (results['end2']) {
            console.log("\nFinal output from SquarePhase (nodeD):", (results['end2'] as any).value);
        }

    } catch (error) {
        console.error("\nError during process execution:", error);
    }
}

// Run the example
runExample();
// 'Executing process "MySimpleProcess" with initial input:', { value: 10 });
// 'AddOnePhase: Received 10');
// 'AddOnePhase: Outputting 11');
// 'MultiplyByTwoPhase: Received 11');
// 'MultiplyByTwoPhase: Outputting 22');
// 'StringifyPhase: Received 22');
// 'StringifyPhase: Outputting "The final number is: 22"');
// 'SquarePhase: Received 11');
// 'SquarePhase: Outputting 121');
// '\nProcess Execution Results:');
// 'Output from nodeA:', { value: 11 });
// 'Output from nodeB:', { value: 22 });
// 'Output from nodeC:', { value: 'The final number is: 22' });
// 'Output from nodeD:', { value: 121 });
// '\nFinal output from StringifyPhase (nodeC):', 'The final number is: 22');
// '\nFinal output from SquarePhase (nodeD):', 121);
```

## Modeling a Decision

This example showcases how to implement conditional logic within a Xenocline process using a Decision. A Decision phase allows the pipeline to dynamically choose its next step—either continuing to further processing or terminating based on the output of the preceding phase.

```js
import { Input, Output, PhaseNode, Process, Phase, executeProcess, Context, ProcessResults, PhaseResults, Termination, createPhase, createPhaseNode, createConnection, Connection, createDecision, createTermination, createProcess, Decision, Beginning, createBeginning } from '@maxdrellin/xenocline';

// --- 1. Define Concrete Phase Implementations ---

// Phase 1: Adds 1 to the input number
const addOnePhase: Phase = createPhase('AddOne', {
    execute: async (input: Input): Promise<Output> => {
        // Assuming input has a 'value' property for this example
        const inputValue = (input as any).value;
        console.log(`AddOnePhase: Received ${inputValue}`);
        const result = inputValue + 1;
        console.log(`AddOnePhase: Outputting ${result}`);
        return { value: result };
    }
});

// Phase 2: Multiplies the input number by 2
const multiplyByTwoPhase: Phase = createPhase('MultiplyByTwo', {
    execute: async (input: Input): Promise<Output> => {
        const inputValue = (input as any).value;
        console.log(`MultiplyByTwoPhase: Received ${inputValue}`);
        const result = inputValue * 2;
        console.log(`MultiplyByTwoPhase: Outputting ${result}`);
        return { value: result };
    }
});

// Phase 3: Converts the number to a string
const stringifyPhase: Phase = createPhase('Stringify', {
    execute: async (input: Input): Promise<Output> => {
        const inputValue = (input as any).value;
        console.log(`StringifyPhase: Received ${inputValue}`);
        const result = `The final number is: ${inputValue}`;
        console.log(`StringifyPhase: Outputting "${result}"`);
        return { value: result };
    }
});

// --- 2. Instantiate Phases (already defined as objects) ---
// No explicit instantiation step needed like with classes,
// addOnePhase, multiplyByTwoPhase, and stringifyPhase are ready to be used.

// --- 3. Define PhaseNodes ---
const toNodeBConnection: Connection = createConnection('conn1', 'nodeB');
const nodeA: PhaseNode = createPhaseNode('nodeA', addOnePhase, { next: [toNodeBConnection] });

const toNodeCConnection: Connection = createConnection('conn2', 'nodeC');
const terminateAtB: Termination = createTermination('decisionEndAtB');
const decisionAtB: Decision = createDecision('decisionAtB', async (output: Output, context: Context) => {
    const inputValue = (output as any).value;
    if (inputValue > 5) {
        console.log(`Decision in nodeB: Value ${inputValue} > 5. Terminating.`);
        return terminateAtB;
    } else {
        console.log(`Decision in nodeB: Value ${inputValue} <= 5. Proceeding to nodeC.`);
        return [toNodeCConnection];
    }
});

const nodeB: PhaseNode = createPhaseNode('nodeB', multiplyByTwoPhase, { next: [decisionAtB] });

const terminateAtC: Termination = createTermination('end');
const nodeC: PhaseNode = createPhaseNode('nodeC', stringifyPhase, { next: terminateAtC });


// --- 4. Define the Process ---
const mySimpleProcess: Process = createProcess('MySimpleProcess', {
    phases: {
        nodeA: nodeA,
        nodeB: nodeB,
        nodeC: nodeC,
    },
});

// --- 5. Execute the Process ---
async function runExample() {
    const initialProcessInput: Input = { value: 10 }; // Generic input
    console.log(
        `Executing process "${mySimpleProcess.name}" with initial input:`,
        initialProcessInput
    );

    try {
        const beginning: Beginning<Input, Context> = createBeginning('nodeA', 'nodeA');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(
            mySimpleProcess,
            beginning,
            { input: initialProcessInput }
        );
        console.log("\nProcess Execution Results:");
        for (const nodeId in phaseResults) {
            console.log(`Output from ${nodeId}:`, phaseResults[nodeId]);
        }

        // Example: Accessing a specific end phase result
        if (results['end']) {
            console.log("\nFinal output from StringifyPhase (nodeC):", (results['end'] as any).value);
        }

    } catch (error) {
        console.error("\nError during process execution:", error);
    }
}

// Run the example
runExample();


// 'Executing process "MySimpleProcess" with initial input:', { value: 10 });
// 'AddOnePhase: Received 10');
// 'AddOnePhase: Outputting 11');
// 'MultiplyByTwoPhase: Received 11');
// 'MultiplyByTwoPhase: Outputting 22');
// 'Decision in nodeB: Value 22 > 5. Terminating.');
// '\nProcess Execution Results:');
// 'Output from nodeA:', { value: 11 });
// 'Output from nodeB:', { value: 22 });
```

### Defining an Aggegrator to Assemble Outputs from Multiple Phases

This example demonstrates how to use an AggregatorNode to combine outputs from multiple parallel processing paths. In this case, we have two paths: one that multiplies a number by 2 and converts it to a string, and another that squares the number. The AggregatorNode waits for both paths to complete and then combines their results into a single output. This is particularly useful when you need to synchronize multiple asynchronous operations and combine their results before proceeding with the next phase of your process.


```js
import { Input, Output, PhaseNode, Process, Phase, executeProcess, AggregationResult, Aggregator, AggregatorNode, Context, ProcessResults, PhaseResults, Termination, createPhase, createConnection, Connection, createPhaseNode, createTermination, createAggregatorNode, createProcess, createAggregator, createBeginning, Beginning } from '@maxdrellin/xenocline';

// --- 1. Define Concrete Phase Implementations ---

// Phase 1: Adds 1 to the input number
const addOnePhase: Phase = createPhase('AddOne', {
    execute: async (input: Input): Promise<Output> => {
        // Assuming input has a 'value' property for this example
        const inputValue = (input as any).value;
        console.log(`AddOnePhase: Received ${inputValue}`);
        const result = inputValue + 1;
        console.log(`AddOnePhase: Outputting ${result}`);
        return { value: result };
    }
});

// Phase 2: Multiplies the input number by 2
const multiplyByTwoPhase: Phase = createPhase('MultiplyByTwo', {
    execute: async (input: Input): Promise<Output> => {
        const inputValue = (input as any).value;
        console.log(`MultiplyByTwoPhase: Received ${inputValue}`);
        const result = inputValue * 2;
        console.log(`MultiplyByTwoPhase: Outputting ${result}`);
        return { value: result };
    }
});

// Phase 3: Divides the number by 3
const divideByThreePhase: Phase = createPhase('DivideByThree', {
    execute: async (input: Input): Promise<Output> => {
        const inputValue = (input as any).value;
        console.log(`DivideByThreePhase: Received ${inputValue}`);
        const result = inputValue / 3;
        console.log(`DivideByThreePhase: Outputting ${result}`);
        return { value: result };
    }
});

// Phase 4: Squares the input number
const squarePhase: Phase = createPhase('Square', {
    execute: async (input: Input): Promise<Output> => {
        const inputValue = (input as any).value;
        console.log(`SquarePhase: Received ${inputValue}`);
        const result = inputValue * inputValue;
        console.log(`SquarePhase: Outputting ${result}`);
        return { value: result };
    }
});

// Interface for the aggregator's storage in the process context
interface AggregatorStorage {
    inputCount: number;
    pendingValue: number;
}

const aggregatorStore: AggregatorStorage = {
    inputCount: 0,
    pendingValue: 0,
}

// Phase 5: Aggregates two numerical inputs (one potentially from a string)
const aggregateSum: Aggregator = createAggregator('AggregateSumPhase', {
    aggregate: async function (input: Input): Promise<AggregationResult<Output>> {
        console.log(`AggregateSumPhase: Received ${input.value}`);
        aggregatorStore.inputCount++;
        aggregatorStore.pendingValue = (input.value as number) + aggregatorStore.pendingValue;
        if (aggregatorStore.inputCount === 2) {
            console.log(`AggregateSumPhase: Outputting ${aggregatorStore.pendingValue}`);
            return { status: 'Ready', output: { value: aggregatorStore.pendingValue } };
        }
        console.log(`AggregateSumPhase: NotYetReady`);
        return { status: 'NotYetReady' };
    }
});

// --- 2. Instantiate Phases (already defined as objects) ---
// No explicit instantiation step needed like with classes,
// addOnePhase, multiplyByTwoPhase, and stringifyPhase are ready to be used.
// squarePhase is also ready.

// --- 3. Define PhaseNodes ---
const toNodeBConnection: Connection = createConnection('conn1', 'nodeB');
const toNodeDConnection: Connection = createConnection('conn2', 'nodeD');
const nodeA: PhaseNode = createPhaseNode('nodeA', addOnePhase, { next: [toNodeBConnection, toNodeDConnection] });

const toNodeCConnection: Connection = createConnection('conn3', 'nodeC');
const nodeB: PhaseNode = createPhaseNode('nodeB', multiplyByTwoPhase, { next: [toNodeCConnection] });

const toNodeEConnection: Connection = createConnection('conn4', 'nodeE');
const nodeC: PhaseNode = createPhaseNode('nodeC', divideByThreePhase, { next: [toNodeEConnection] });


const nodeD: PhaseNode = createPhaseNode('nodeD', squarePhase, { next: [toNodeEConnection] });

// New Node E for Aggregation
const endTermination: Termination = createTermination('endE');
const nodeE: AggregatorNode = createAggregatorNode('nodeE', aggregateSum, { next: endTermination });


// --- 4. Define the Process ---
const mySimpleProcess: Process = createProcess('MySimpleProcess', {
    phases: {
        nodeA: nodeA,
        nodeB: nodeB,
        nodeC: nodeC,
        nodeD: nodeD,
        nodeE: nodeE, // Added nodeE
    },
});

// --- 5. Execute the Process ---
async function runExample() {
    const initialProcessInput: Input = { value: 10 }; // Generic input
    console.log(
        `Executing process "${mySimpleProcess.name}" with initial input:`,
        initialProcessInput
    );

    try {
        const beginning: Beginning<Input, Context> = createBeginning('nodeA', 'nodeA');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(
            mySimpleProcess,
            beginning,
            { input: initialProcessInput }
        );
        console.log("\nProcess Execution Results:");
        for (const nodeId in phaseResults) {
            console.log(`Output from ${nodeId}:`, phaseResults[nodeId]);
        }

        // Example: Accessing a specific end phase result
        if (results['endE']) {
            console.log("\nFinal output from AggregateSumPhase (nodeE):", (results['endE'] as any).value);
        }

    } catch (error) {
        console.error("\nError during process execution:", error);
    }
}

// Run the example
runExample();

// 'Executing process "MySimpleProcess" with initial input:', { value: 10 });
// 'AddOnePhase: Received 10');
// 'AddOnePhase: Outputting 11');
// 'MultiplyByTwoPhase: Received 11');
// 'MultiplyByTwoPhase: Outputting 22');
// '\nProcess Execution Results:');
// 'Output from nodeA:', { value: 11 });
// 'Output from nodeB:', { value: 22 });
// 'Output from nodeC:', { value: 7.333333333333333 });
// 'Output from nodeD:', { value: 121 });
// 'Output from nodeE:', { value: 128.33333333333333 });
// '\nFinal output from AggregateSumPhase (nodeE):', 128.33333333333333);
```

### Registering an Event Handler with a Process Execution

You can now register event handlers when executing a process, providing a powerful way to monitor and react to process execution. This feature enables real-time logging, debugging, and custom event handling throughout the pipeline's lifecycle. By implementing event handlers, you can track phase transitions, monitor execution progress, and respond to specific events as they occur, making it easier to debug and maintain complex processes.



```js
import { Input, Output, PhaseNode, Process, Phase, executeProcess, Context, ProcessResults, PhaseResults, Termination, createPhase, createPhaseNode, createConnection, createEventHandler, createTermination, createProcess, Beginning, createBeginning, Event } from '@maxdrellin/xenocline';

// --- 1. Define Concrete Phase Implementations ---

// Phase 1: Adds 1 to the input number
const addOneExecute = async (input: Input): Promise<Output> => {
    // Assuming input has a 'value' property for this example
    const inputValue = (input as any).value;
    console.log(`AddOnePhase: Received ${inputValue}`);
    const result = inputValue + 1;
    console.log(`AddOnePhase: Outputting ${result}`);
    return { value: result };
}
const addOnePhase: Phase = createPhase('AddOne', { execute: addOneExecute });

// Phase 2: Multiplies the input number by 2
const multiplyByTwoExecute = async (input: Input): Promise<Output> => {
    const inputValue = (input as any).value;
    console.log(`MultiplyByTwoPhase: Received ${inputValue}`);
    const result = inputValue * 2;
    console.log(`MultiplyByTwoPhase: Outputting ${result}`);
    return { value: result };
}
const multiplyByTwoPhase: Phase = createPhase('MultiplyByTwo', { execute: multiplyByTwoExecute });

// Phase 3: Converts the number to a string
const stringifyExecute = async (input: Input): Promise<Output> => {
    const inputValue = (input as any).value;
    console.log(`StringifyPhase: Received ${inputValue}`);
    const result = `The final number is: ${inputValue}`;
    console.log(`StringifyPhase: Outputting "${result}"`);
    return { value: result };
}
const stringifyPhase: Phase = createPhase('Stringify', { execute: stringifyExecute });

// --- 2. Instantiate Phases (already defined as objects) ---
// No explicit instantiation step needed like with classes,
// addOnePhase, multiplyByTwoPhase, and stringifyPhase are ready to be used.

// --- 3. Define PhaseNodes ---
const toNodeBConnection = createConnection('conn1', 'nodeB');
const nodeA: PhaseNode = createPhaseNode(
    'nodeA',
    addOnePhase,
    { next: [toNodeBConnection] }
);

const toNodeCConnection = createConnection('conn2', 'nodeC');
const nodeB: PhaseNode = createPhaseNode(
    'nodeB',
    multiplyByTwoPhase,
    { next: [toNodeCConnection] }
);

const endTermination = createTermination('end', { terminate: async (output: Output) => output });
const nodeC: PhaseNode = createPhaseNode('nodeC', stringifyPhase, { next: endTermination });

const phases = {
    nodeA: nodeA,
    nodeB: nodeB,
    nodeC: nodeC,
};

// --- 4. Define the Process ---
const mySimpleProcess: Process = createProcess(
    'MySimpleProcess',
    {
        phases: phases,
    }, // Add any relevant context
);

// --- 5. Execute the Process ---
async function runExample() {
    const initialProcessInput: Input = { value: 10 }; // Generic input
    console.log(
        `Executing process "${mySimpleProcess.name}" with initial input:`,
        initialProcessInput
    );

    const eventHandler = createEventHandler(async (event: Event, context: Context) => {
        console.log('Received an Event of type: \"%s\" at stage \"%s\" from id: \"%s\"', event.type, event.stage, event.sourceId);
    });

    try {

        const beginning: Beginning<Input, Context> = createBeginning('nodeA', 'nodeA');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(
            mySimpleProcess,
            beginning,
            { input: initialProcessInput, eventHandlers: [eventHandler] }
        );

        console.log("\nProcess Execution Results:");
        for (const nodeId in phaseResults) {
            console.log(`Output from ${nodeId}:`, phaseResults[nodeId]);
        }

        // Example: Accessing a specific end phase result
        if (results['end']) {
            console.log("\nFinal output from StringifyPhase (nodeC):", (results['end'] as any).value);
        }

    } catch (error) {
        console.error("\nError during process execution:", error);
    }
}

// Run the example
runExample();
// Output from nodeA: { value: 11 }
// Output from nodeB: { value: 22 }
// Output from nodeD: { value: 121 }
// Output from nodeC: { value: 'The final number is: 22' }

// Final output from StringifyPhase (nodeC): The final number is: 22

// Final output from SquarePhase (nodeD): 121

// Process Execution Results:
// Output from nodeA: { value: 11 }
// Output from nodeB: { value: 22 }
// Output from nodeD: { value: 121 }
// Output from nodeC: { value: 7.333333333333333 }
// Output from nodeE: { value: 128.33333333333334 }

// Final output from AggregateSumPhase (nodeE): 128.33333333333334
// Received an Event of type: "node" at stage "start" from id: "nodeC"
// Received an Event of type: "phase" at stage "start" from id: "nodeC"
// StringifyPhase: Received 22
// StringifyPhase: Outputting "The final number is: 22"
// Received an Event of type: "transition" at stage "end" from id: "nodeB"
// Received an Event of type: "phase" at stage "execute" from id: "nodeC"
// Received an Event of type: "transition" at stage "start" from id: "nodeC"
// Received an Event of type: "node" at stage "end" from id: "nodeB"
// Received an Event of type: "transition" at stage "terminate" from id: "nodeC"
// Received an Event of type: "process" at stage "end" from id: "MySimpleProcess"

// Process Execution Results:
// Output from nodeA: { value: 11 }
// Output from nodeB: { value: 22 }
// Output from nodeC: { value: 'The final number is: 22' }
// Received an Event of type: "node" at stage "end" from id: "nodeC"
```

Copyright 2025 Max Drellin

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

