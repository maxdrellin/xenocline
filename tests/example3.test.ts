import {
    Input, Output, PhaseNode, Process, Phase, executeProcess, Context,
    ProcessResults, PhaseResults, Termination, createPhase, createPhaseNode,
    createConnection, Connection, createDecision, createTermination, createProcess,
    Decision, Beginning, createBeginning
} from '../src/xenocline';
import { jest } from '@jest/globals';

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


describe('example1', () => {

    test('runExample', async () => {
        // Run the example
        const consoleSpy = jest.spyOn(console, 'log');

        await runExample();

        expect(consoleSpy).toHaveBeenCalledWith('Executing process "MySimpleProcess" with initial input:', { value: 10 });
        expect(consoleSpy).toHaveBeenCalledWith('AddOnePhase: Received 10');
        expect(consoleSpy).toHaveBeenCalledWith('AddOnePhase: Outputting 11');
        expect(consoleSpy).toHaveBeenCalledWith('MultiplyByTwoPhase: Received 11');
        expect(consoleSpy).toHaveBeenCalledWith('MultiplyByTwoPhase: Outputting 22');
        expect(consoleSpy).toHaveBeenCalledWith('Decision in nodeB: Value 22 > 5. Terminating.');
        expect(consoleSpy).toHaveBeenCalledWith('\nProcess Execution Results:');
        expect(consoleSpy).toHaveBeenCalledWith('Output from nodeA:', { value: 11 });
        expect(consoleSpy).toHaveBeenCalledWith('Output from nodeB:', { value: 22 });

        consoleSpy.mockRestore();
    });
});