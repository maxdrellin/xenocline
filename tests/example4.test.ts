import { Input, Output, PhaseNode, Process, Phase, executeProcess, AggregationResult, Aggregator, AggregatorNode, Context, ProcessResults, PhaseResults, Termination, createPhase, createConnection, Connection, createPhaseNode, createTermination, createAggregatorNode, createProcess, createAggregator, createBeginning, Beginning } from '../src/xenocline';
import { describe, test, expect, vi } from 'vitest';

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

// Extended Context interface to include aggregator storage
interface MyContext extends Context {
    aggregatorStore?: AggregatorStorage;
}

// Phase 5: Aggregates two numerical inputs using context-based storage
// This demonstrates the correct pattern: store aggregator state in the process context,
// not in module-level variables, to avoid race conditions in concurrent executions
const aggregateSum: Aggregator = createAggregator('AggregateSumPhase', {
    aggregate: async function (input: Input, context: MyContext): Promise<AggregationResult<Output>> {
        console.log(`AggregateSumPhase: Received ${input.value}`);

        // Initialize aggregator storage in context if not present
        if (!context.aggregatorStore) {
            context.aggregatorStore = {
                inputCount: 0,
                pendingValue: 0,
            };
        }

        const store = context.aggregatorStore;
        store.inputCount++;
        store.pendingValue = (input.value as number) + store.pendingValue;

        if (store.inputCount === 2) {
            console.log(`AggregateSumPhase: Outputting ${store.pendingValue}`);
            return { status: 'Ready', output: { value: store.pendingValue } };
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

// Note: runExample() is intentionally NOT called at module level
// It should only be called within the test context to avoid unhandled promise rejections
// during test setup


describe('example4', () => {

    // Note: No need for beforeEach to reset state since aggregator storage
    // is now context-based and isolated per process execution

    test('runExample', async () => {
        // Run the example
        const consoleSpy = vi.spyOn(console, 'log');

        await runExample();

        expect(consoleSpy).toHaveBeenCalledWith('Executing process "MySimpleProcess" with initial input:', { value: 10 });
        expect(consoleSpy).toHaveBeenCalledWith('AddOnePhase: Received 10');
        expect(consoleSpy).toHaveBeenCalledWith('AddOnePhase: Outputting 11');
        expect(consoleSpy).toHaveBeenCalledWith('MultiplyByTwoPhase: Received 11');
        expect(consoleSpy).toHaveBeenCalledWith('MultiplyByTwoPhase: Outputting 22');
        expect(consoleSpy).toHaveBeenCalledWith('\nProcess Execution Results:');
        expect(consoleSpy).toHaveBeenCalledWith('Output from nodeA:', { value: 11 });
        expect(consoleSpy).toHaveBeenCalledWith('Output from nodeB:', { value: 22 });
        expect(consoleSpy).toHaveBeenCalledWith('Output from nodeC:', { value: 7.333333333333333 });
        expect(consoleSpy).toHaveBeenCalledWith('Output from nodeD:', { value: 121 });
        expect(consoleSpy).toHaveBeenCalledWith('Output from nodeE:', { value: 128.33333333333333 });
        expect(consoleSpy).toHaveBeenCalledWith('\nFinal output from AggregateSumPhase (nodeE):', 128.33333333333333);

        consoleSpy.mockRestore();
    });
});
