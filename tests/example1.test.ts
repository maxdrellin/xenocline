import { vi } from 'vitest';
import { Input, Output, PhaseNode, Process, Phase, executeProcess, Context, ProcessResults, PhaseResults, Termination, createPhase, createPhaseNode, createConnection, createTermination, createProcess, Beginning, createBeginning } from '../src/xenocline';

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


describe('example1', () => {

    test('runExample', async () => {

        const consoleSpy = vi.spyOn(console, 'log');

        // Run the example
        await runExample();

        expect(consoleSpy).toHaveBeenCalledWith('Executing process "MySimpleProcess" with initial input:', { value: 10 });
        expect(consoleSpy).toHaveBeenCalledWith('AddOnePhase: Received 10');
        expect(consoleSpy).toHaveBeenCalledWith('AddOnePhase: Outputting 11');
        expect(consoleSpy).toHaveBeenCalledWith('MultiplyByTwoPhase: Received 11');
        expect(consoleSpy).toHaveBeenCalledWith('MultiplyByTwoPhase: Outputting 22');
        expect(consoleSpy).toHaveBeenCalledWith('StringifyPhase: Received 22');
        expect(consoleSpy).toHaveBeenCalledWith('StringifyPhase: Outputting "The final number is: 22"');
        expect(consoleSpy).toHaveBeenCalledWith('\nProcess Execution Results:');
        expect(consoleSpy).toHaveBeenCalledWith('Output from nodeA:', { value: 11 });
        expect(consoleSpy).toHaveBeenCalledWith('Output from nodeB:', { value: 22 });
        expect(consoleSpy).toHaveBeenCalledWith('Output from nodeC:', { value: 'The final number is: 22' });
        expect(consoleSpy).toHaveBeenCalledWith('\nFinal output from StringifyPhase (nodeC):', 'The final number is: 22');
        consoleSpy.mockRestore();
    });
});
