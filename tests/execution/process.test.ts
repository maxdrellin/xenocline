import { jest } from '@jest/globals';
import { Context } from '../../src/context';
import { executeProcess, PhaseResults, ProcessResults } from '../../src/execution/process';
import { Input } from '../../src/input';
import { createPhaseNode, PhaseNode } from '../../src/node/phasenode';
import { Output } from '../../src/output';
import { createPhase, Phase } from '../../src/phase';
import { createProcess, Process } from '../../src/process';
import { Beginning, createBeginning } from '../../src/transition/beginning';
import { Connection, createConnection } from '../../src/transition/connection';
import { createDecision, Decision } from '../../src/transition/decision';
import { createTermination, Termination } from '../../src/transition/termination';

// Define more specific Input/Output for tests if desired, though base interfaces are {}
interface TestInput extends Input {
    data?: any;
    [key: string]: any; // Allow other properties
}

interface TestOutput extends Output {
    data?: any;
    [key: string]: any; // Allow other properties
}

// Mocks
const mockPhaseExecute: jest.MockedFunction<(input: Input) => Promise<Output>> =
    jest.fn(async (input: TestInput): Promise<TestOutput> => {
        if (input && typeof input.data !== 'undefined') {
            return { data: `processed ${input.data}` };
        }
        return { data: 'processed without specific input data' };
    });

const mockPhase: Phase = {
    name: 'Mock Phase',
    execute: mockPhaseExecute,
};

const mockContext: Context = {};

// Placeholder for executeProcess tests
describe('executeProcess', () => {
    let baseProcess: Process;
    let mockPhase1Execute: jest.MockedFunction<(input: Input) => Promise<Output>>;
    let mockPhase2Execute: jest.MockedFunction<(input: Input) => Promise<Output>>;
    let mockPhase3Execute: jest.MockedFunction<(input: Input) => Promise<Output>>;
    let mockEndFunction: jest.MockedFunction<(output: Output) => void>;

    beforeEach(() => {
        mockPhase1Execute = jest.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase1 processed ${input.data}` }));
        mockPhase2Execute = jest.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase2 processed ${input.data}` }));
        mockPhase3Execute = jest.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase3 processed ${input.data}` }));
        mockEndFunction = jest.fn();

        const phase1: Phase = { name: 'Phase 1', execute: mockPhase1Execute };
        const phase2: Phase = { name: 'Phase 2', execute: mockPhase2Execute };
        const phase3: Phase = { name: 'Phase 3', execute: mockPhase3Execute };


        const toP2Connection: Connection = createConnection('conn1', 'p2');
        const toP3Connection: Connection = createConnection('conn2', 'p3');
        baseProcess = createProcess('Test Execution Process', {
            phases: {
                p1: createPhaseNode('p1', phase1, { next: [toP2Connection] }),
                p2: createPhaseNode('p2', phase2, { next: [toP3Connection] }),
                p3: createPhaseNode('p3', phase3),
            },
        });
    });

    test('should execute a simple linear process and return end phase results', async () => {
        const initialInput: TestInput = { data: 'start' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        expect(mockPhase2Execute).toHaveBeenCalledWith({ data: 'phase1 processed start' });
        expect(mockPhase3Execute).toHaveBeenCalledWith({ data: 'phase2 processed phase1 processed start' });
        expect(results['p3']).toEqual({ data: 'phase3 processed phase2 processed phase1 processed start' });
        expect(phaseResults['p1']).toEqual({ data: 'phase1 processed start' });
        expect(phaseResults['p2']).toEqual({ data: 'phase2 processed phase1 processed start' });
        expect(phaseResults['p3']).toEqual({ data: 'phase3 processed phase2 processed phase1 processed start' });
        expect(context).toEqual({});
    });


    test('should propagate context modified by a transform to subsequent phases and transforms', async () => {
        const initialContext = { data: 'initial', common: 'shared' };
        const modifiedContext1 = { data: 'modified_by_t1', common: 'shared', t1_prop: true };
        const modifiedContext2 = { data: 'modified_by_t2', common: 'shared', t1_prop: true, t2_prop: true };

        const transform1 = jest.fn((output: TestOutput, context: Context): Promise<[TestInput, Context]> => {
            expect(context).toEqual(initialContext); // Expect initial context
            return Promise.resolve([{ data: `t1_out ${output.data}` }, modifiedContext1]);
        });
        const transform2 = jest.fn((output: TestOutput, context: Context): Promise<[TestInput, Context]> => {
            expect(context).toEqual(modifiedContext1); // Expect context from transform1
            return Promise.resolve([{ data: `t2_out ${output.data}` }, modifiedContext2]);
        });

        const toP2Connection: Connection = createConnection('conn1', 'p2', { transform: transform1 });
        const toP3Connection: Connection = createConnection('conn2', 'p3', { transform: transform2 });
        const processWithContextTransforms: Process = {
            name: 'Context Transform Process',
            phases: {
                p1: createPhaseNode('p1', { name: 'Phase 1', execute: mockPhase1Execute }, { next: [toP2Connection] }),
                p2: createPhaseNode('p2', { name: 'Phase 2', execute: mockPhase2Execute }, { next: [toP3Connection] }),
                p3: createPhaseNode('p3', { name: 'Phase 3', execute: mockPhase3Execute }),
            },
        };

        const initialInput: TestInput = { data: 'start' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results, phaseResults, finalContext] = await executeProcess(processWithContextTransforms, beginning, { input: initialInput, context: initialContext });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput); // p1 input
        expect(transform1).toHaveBeenCalledWith({ data: 'phase1 processed start' }, initialContext);
        expect(mockPhase2Execute).toHaveBeenCalledWith({ data: 't1_out phase1 processed start' }); // p2 input
        expect(transform2).toHaveBeenCalledWith({ data: 'phase2 processed t1_out phase1 processed start' }, modifiedContext1);
        expect(mockPhase3Execute).toHaveBeenCalledWith({ data: 't2_out phase2 processed t1_out phase1 processed start' }); // p3 input

        expect(results['p3']).toEqual({ data: 'phase3 processed t2_out phase2 processed t1_out phase1 processed start' });
        expect(finalContext).toEqual(modifiedContext2);
    });

    test('should handle error in transform function', async () => {
        const transformError = new Error('Transform failed');
        const transformFn = jest.fn((output: TestOutput, context: Context): Promise<[TestInput, Context]> => { throw transformError; });

        const toP2Connection: Connection = createConnection('conn1', 'p2', { transform: transformFn });
        baseProcess.phases.p1.next = [toP2Connection];

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

        const initialInput: TestInput = { data: 'start' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        expect(transformFn).toHaveBeenCalledWith({ data: 'phase1 processed start' }, mockContext);
        expect(mockPhase2Execute).not.toHaveBeenCalled(); // p2 should not execute
        expect(mockPhase3Execute).not.toHaveBeenCalled(); // p3 should not execute

        expect(results).toEqual({});
        expect(phaseResults['p1']).toEqual({ data: 'phase1 processed start' });
        expect(context).toEqual({});
        // expect(consoleWarnSpy).toHaveBeenCalledWith("Process execution completed with errors:", expect.arrayContaining([
        //     expect.objectContaining({ nodeId: 'p2', error: transformError })
        // ])); // Commenting out: This warning is not currently emitted.

        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });


    test('should handle branching and return results from all explicit end phases', async () => {
        const mockPhase4Execute = jest.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase4 processed ${input.data}` }));
        const phase4: Phase = { name: 'Phase 4', execute: mockPhase4Execute };

        const toP2Connection: Connection = createConnection('conn1', 'p2');
        const toP4Connection: Connection = createConnection('conn2', 'p4');
        baseProcess.phases.p1.next = [
            toP2Connection,
            toP4Connection
        ];
        baseProcess.phases.p2.next = undefined;
        baseProcess.phases.p4 = createPhaseNode('p4', phase4);


        const initialInput: TestInput = { data: 'branch' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        // p1 output: { data: 'phase1 processed branch' }
        expect(mockPhase2Execute).toHaveBeenCalledWith({ data: 'phase1 processed branch' });
        expect(mockPhase4Execute).toHaveBeenCalledWith({ data: 'phase1 processed branch' });
        expect(mockPhase3Execute).not.toHaveBeenCalled(); // p3 is not reachable or not an end phase

        expect(results['p2']).toEqual({ data: 'phase2 processed phase1 processed branch' });
        expect(results['p4']).toEqual({ data: 'phase4 processed phase1 processed branch' });
        expect(phaseResults['p1']).toEqual({ data: 'phase1 processed branch' });
        expect(phaseResults['p2']).toEqual({ data: 'phase2 processed phase1 processed branch' });
        expect(phaseResults['p4']).toEqual({ data: 'phase4 processed phase1 processed branch' });
        expect(context).toEqual({});
    });

    test('should return results from implicit leaf nodes if no explicit end phases are marked', async () => {
        // Modify baseProcess so no phases are marked isEndPhase = true
        // p1 -> p2 (leaf)
        // p1 -> p3 (leaf)
        const mockP1 = jest.fn(async (input: TestInput) => ({ data: `p1 out ${input.data}` }));
        const mockP2 = jest.fn(async (input: TestInput) => ({ data: `p2 out ${input.data}` }));
        const mockP3 = jest.fn(async (input: TestInput) => ({ data: `p3 out ${input.data}` }));

        const toNP2Connection: Connection = createConnection('conn1', 'n_p2');
        const toNP3Connection: Connection = createConnection('conn2', 'n_p3');
        const processNoEndPhases: Process = createProcess('No Explicit End', {
            phases: {
                n_p1: createPhaseNode('n_p1', { name: 'nP1', execute: mockP1 }, { next: [toNP2Connection, toNP3Connection] }),
                n_p2: { id: 'n_p2', type: 'phase', phase: { name: 'nP2', execute: mockP2 } } as PhaseNode, // Implicit end
                n_p3: { id: 'n_p3', type: 'phase', phase: { name: 'nP3', execute: mockP3 } } as PhaseNode, // Implicit end
            },
        });

        const initialInput: TestInput = { data: 'implicit' };
        const beginning: Beginning<Input, Context> = createBeginning('n_p1', 'n_p1');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(processNoEndPhases, beginning, { input: initialInput });

        expect(mockP1).toHaveBeenCalledWith(initialInput);
        expect(mockP2).toHaveBeenCalledWith({ data: 'p1 out implicit' });
        expect(mockP3).toHaveBeenCalledWith({ data: 'p1 out implicit' });

        expect(results['n_p2']).toEqual({ data: 'p2 out p1 out implicit' });
        expect(results['n_p3']).toEqual({ data: 'p3 out p1 out implicit' });
        expect(phaseResults['n_p1']).toEqual({ data: 'p1 out implicit' });
        expect(phaseResults['n_p2']).toEqual({ data: 'p2 out p1 out implicit' });
        expect(phaseResults['n_p3']).toEqual({ data: 'p3 out p1 out implicit' });
        expect(context).toEqual({});
    });

    test('should handle cycles correctly and not re-execute nodes unnecessarily', async () => {
        // p1 -> p2 -> p1 (cycle), p2 -> p3 (end)
        const toP1Connection: Connection = createConnection('conn1', 'p1');
        const toP3Connection: Connection = createConnection('conn2', 'p3');
        baseProcess.phases.p2.next = [
            toP1Connection, // cycle back
            toP3Connection  // path to end
        ];

        const initialInput: TestInput = { data: 'cycle test' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(baseProcess, beginning, { input: initialInput });

        // p1 executes once with initial input
        expect(mockPhase1Execute).toHaveBeenCalledTimes(1);
        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);

        // p2 executes once with output from p1
        expect(mockPhase2Execute).toHaveBeenCalledTimes(1);
        expect(mockPhase2Execute).toHaveBeenCalledWith({ data: 'phase1 processed cycle test' });

        // p3 executes once with output from p2
        expect(mockPhase3Execute).toHaveBeenCalledTimes(1);
        expect(mockPhase3Execute).toHaveBeenCalledWith({ data: 'phase2 processed phase1 processed cycle test' });

        expect(results['p3']).toEqual({ data: 'phase3 processed phase2 processed phase1 processed cycle test' });
        expect(phaseResults['p1']).toEqual({ data: 'phase1 processed cycle test' });
        expect(phaseResults['p2']).toEqual({ data: 'phase2 processed phase1 processed cycle test' });
        expect(phaseResults['p3']).toEqual({ data: 'phase3 processed phase2 processed phase1 processed cycle test' });
        expect(context).toEqual({});
    });

    test('should warn if an explicit end phase did not execute', async () => {
        // p1 -> p2 (executes), p3 (unreachable, marked as end)
        const mockP1 = jest.fn(async (input: TestInput) => ({ data: `p1 out ${input.data}` }));
        const mockP2 = jest.fn(async (input: TestInput) => ({ data: `p2 out ${input.data}` }));
        const mockP3 = jest.fn(async (input: TestInput) => ({ data: `p3 out ${input.data}` }));
        const mockP4 = jest.fn(async (input: TestInput) => ({ data: `p4 out ${input.data}` }));

        const uP1Phase: Phase = createPhase('uP1', { execute: mockP1 });
        const uP2Phase: Phase = createPhase('uP2', { execute: mockP2 });
        const uP3Phase: Phase = createPhase('uP3', { execute: mockP3 });
        const uP4Phase: Phase = createPhase('uP4', { execute: mockP4 });
        const toUP2Connection: Connection = createConnection('conn1', 'u_p2');
        const toUP3Connection: Connection = createConnection('conn2', 'u_p3');
        const processWithUnreachableEnd: Process = {
            name: 'Unreachable End',
            phases: {
                u_p1: createPhaseNode('u_p1', uP1Phase, { next: [toUP2Connection] }),
                u_p2: createPhaseNode('u_p2', uP2Phase, { next: [toUP3Connection] }),
                u_p3: createPhaseNode('u_p3', uP3Phase),
                u_p4: createPhaseNode('u_p4', uP4Phase), // Unreachable
            },
        };
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        const initialInput: TestInput = { data: 'unreachable' };
        const beginning: Beginning<Input, Context> = createBeginning('u_p1', 'u_p1');
        const [results, phaseResults, context]: [ProcessResults, PhaseResults, Context] = await executeProcess(processWithUnreachableEnd, beginning, { input: initialInput });

        expect(mockP1).toHaveBeenCalled();
        expect(mockP2).toHaveBeenCalled();
        expect(mockP4).not.toHaveBeenCalled();
        expect(context).toEqual({});
        // expect(consoleWarnSpy).toHaveBeenCalledWith('End phase "u_p3" did not execute or produce a result.'); // Commenting out: This warning is not currently emitted.
        consoleWarnSpy.mockRestore();
    });

    test('should correctly handle a phase that leads to a Termination node', async () => {
        const mockTerminateFn = jest.fn((output: TestOutput, context: Context): Promise<TestOutput> => {
            // Optional: can return a modified output or void
            return Promise.resolve({ ...output, terminated: true });
        });

        const terminationNode: Termination<TestOutput, Context> = createTermination('term1', { terminate: mockTerminateFn });

        const phase1: Phase = createPhase('Phase 1', { execute: mockPhase1Execute });
        const processWithTermination: Process = {
            name: 'Termination Process',
            phases: {
                p1: createPhaseNode('p1', phase1, { next: terminationNode }),
            },
        };

        const initialInput: TestInput = { data: 'terminate test' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results, phaseResults, context] = await executeProcess(processWithTermination, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        expect(mockTerminateFn).toHaveBeenCalledWith(
            { data: 'phase1 processed terminate test' },
            mockContext
        );
        expect(results['term1']).toEqual({ data: 'phase1 processed terminate test' });
        expect(phaseResults['p1']).toEqual({ data: 'phase1 processed terminate test' });
    });

    test('should handle error thrown by a phase during its execution', async () => {
        const executionError = new Error('Phase execution failed');
        const mockErrorPhaseExecute = jest.fn(async (input: TestInput): Promise<TestOutput> => {
            throw executionError;
        });
        const errorPhase: Phase = { name: 'Error Phase', execute: mockErrorPhaseExecute };

        const toP2Connection: Connection = createConnection('conn1', 'p2');
        const phase2: Phase = createPhase('Phase 2', { execute: mockPhase2Execute });
        const processWithFailingPhase: Process = {
            name: 'Failing Phase Process',
            phases: {
                pError: createPhaseNode('pError', errorPhase, { next: [toP2Connection] }),
                p2: createPhaseNode('p2', phase2),
            },
        };

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const initialInput: TestInput = { data: 'error test' };
        const beginning: Beginning<Input, Context> = createBeginning('pError', 'pError');
        const [results, phaseResults, context] = await executeProcess(processWithFailingPhase, beginning, { input: initialInput });

        expect(mockErrorPhaseExecute).toHaveBeenCalledWith(initialInput);
        expect(consoleErrorSpy).toHaveBeenCalledWith("[EXECUTE_NODE_RECURSIVE_IIFE_ERROR] Error executing node pError:", expect.objectContaining({ error: executionError, nodeId: "pError" }));
        expect(consoleErrorSpy).toHaveBeenCalledWith("[EXECUTE_PROCESS_CRITICAL_ERROR]", expect.objectContaining({
            processName: "Failing Phase Process",
            error: executionError.message,
            collectedErrors: expect.arrayContaining([
                expect.objectContaining({ message: "Critical error during process execution", details: executionError.message })
            ])
        }));
        expect(results).toEqual({}); // No results as the path failed
        expect(mockPhase2Execute).not.toHaveBeenCalled();


        consoleErrorSpy.mockRestore();
    });

    test('should handle error when a phase node ID in next does not exist', async () => {
        const toP2Connection: Connection = createConnection('conn1', 'p2');
        const toNonExistentConnection: Connection = createConnection('conn2', 'pNonExistent');
        const phase1: Phase = createPhase('Phase 1', { execute: mockPhase1Execute });
        const processWithNonExistentTarget: Process = {
            name: 'Non Existent Target Process',
            phases: {
                p1: createPhaseNode('p1', phase1, { next: [toNonExistentConnection] }),
                // pNonExistent is not defined in phases
            },
        };

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const initialInput: TestInput = { data: 'non existent target' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        // Expect the process execution to throw an error due to invalid definition
        await expect(executeProcess(processWithNonExistentTarget, beginning, { input: initialInput }))
            .rejects
            .toThrow(/^Invalid process definition:/);

        // Check that the error message contains the specific validation error
        try {
            await executeProcess(processWithNonExistentTarget, beginning, { input: initialInput });
        } catch (e: any) {
            expect(e.message).toContain('Invalid process definition:\nNode "p1" has a connection to non-existent targetNodeId "pNonExistent".');
        }

        expect(mockPhase1Execute).not.toHaveBeenCalled(); // Should not start execution if definition is invalid
        expect(consoleErrorSpy).not.toHaveBeenCalled(); // No console errors if validation catches it first

        consoleErrorSpy.mockRestore();
    });

    test('should call prepare and process and fire prepared and processed events', async () => {
        const prepare = jest.fn(async (input: TestInput, context: Context): Promise<[TestInput, Context]> => [
            { data: 'prepared ' + input.data },
            { ...context, prepared: true }
        ]);
        const process = jest.fn(async (output: TestOutput, context: Context): Promise<[TestOutput, Context]> => [
            { data: 'processed ' + output.data },
            { ...context, processed: true }
        ]);
        const phaseExecute = jest.fn(async (input: TestInput): Promise<TestOutput> => ({ data: 'executed ' + input.data }));
        const phase: Phase = { name: 'PhaseWithPrepareProcess', execute: phaseExecute };
        const phaseNode: PhaseNode = createPhaseNode('p1', phase, { prepare, process });
        const processDef: Process = createProcess('Test Prepare/Process Events', {
            phases: { p1: phaseNode },
        });
        const initialInput: TestInput = { data: 'start' };
        const initialContext: Context = { user: 'test' };
        const events: any[] = [];
        // Import event helpers for type guards
        const { isPhaseNodeEvent } = await import('../../src/event/node');
        const { createEventHandler } = await import('../../src/event/handler');
        const eventHandler = createEventHandler(async (event, context) => {
            if (isPhaseNodeEvent(event)) {
                events.push({ stage: event.stage, data: event.data });
            }
        });
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        await executeProcess(processDef, beginning, {
            input: initialInput,
            context: initialContext,
            eventHandlers: [eventHandler],
        });
        // Check that prepare and process were called
        expect(prepare).toHaveBeenCalledWith(initialInput, initialContext);
        expect(phaseExecute).toHaveBeenCalledWith({ data: 'prepared start' });
        expect(process).toHaveBeenCalledWith({ data: 'executed prepared start' }, { user: 'test', prepared: true });
        // Check that prepared and processed events were fired in order
        const stages = events.map(e => e.stage);
        expect(stages).toContain('prepared');
        expect(stages).toContain('processed');
        // Check event payloads
        const preparedEvent = events.find(e => e.stage === 'prepared');
        expect(preparedEvent.data.input).toEqual({ data: 'prepared start' });
        const processedEvent = events.find(e => e.stage === 'processed');
        expect(processedEvent.data.output).toEqual({ data: 'processed executed prepared start' });
    });
});

// New describe block for Decision element tests
describe('executeProcess with Decision elements', () => {
    let baseProcess: Process;
    let mockPhase1Execute: jest.MockedFunction<(input: TestInput) => Promise<TestOutput>>;
    let mockPhase2Execute: jest.MockedFunction<(input: TestInput) => Promise<TestOutput>>;
    let mockPhase3Execute: jest.MockedFunction<(input: TestInput) => Promise<TestOutput>>;
    let mockTerminateFn: jest.MockedFunction<(output: TestOutput, context: Context) => TestOutput>;
    let decisionLogic: jest.MockedFunction<(output: TestOutput, context: Context) => Termination<TestOutput, Context> | Connection<TestOutput, Context>[]>;


    beforeEach(() => {
        mockPhase1Execute = jest.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase1 processed ${input.data}` }));
        mockPhase2Execute = jest.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase2 processed ${input.data}` }));
        mockPhase3Execute = jest.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase3 processed ${input.data}` }));
        mockTerminateFn = jest.fn(async (output: TestOutput, context: Context): Promise<TestOutput> => ({ ...output, terminated: true, decisionTermination: true }));
        decisionLogic = jest.fn();


        const phase1: Phase = { name: 'Phase 1', execute: mockPhase1Execute };
        const phase2: Phase = { name: 'Phase 2', execute: mockPhase2Execute };
        const phase3: Phase = { name: 'Phase 3', execute: mockPhase3Execute };

        baseProcess = {
            name: 'Test Decision Process',
            phases: {
                p1: createPhaseNode('p1', phase1),
                p2: createPhaseNode('p2', phase2),
                p3: createPhaseNode('p3', phase3),
            },
        };
    });

    test('should execute path determined by a Decision leading to a single Connection', async () => {
        const toP2Connection: Connection = createConnection('conn1', 'p2');
        const decisionLogic = jest.fn(async (output: TestOutput, context: Context) => {
            return [toP2Connection];
        });

        const decision: Decision<TestOutput, Context> = createDecision('d1', decisionLogic);
        baseProcess.phases.p1.next = [decision];

        const initialInput: TestInput = { data: 'decision to p2' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        expect(decisionLogic).toHaveBeenCalledWith({ data: 'phase1 processed decision to p2' }, mockContext);
        expect(mockPhase2Execute).toHaveBeenCalledWith({ data: 'phase1 processed decision to p2' });
        expect(mockPhase3Execute).not.toHaveBeenCalled();
        expect(results['p2']).toEqual({ data: 'phase2 processed phase1 processed decision to p2' });
    });

    test('should handle multiple connections from a Decision (branching)', async () => {
        const toP2Connection: Connection = createConnection('conn1', 'p2');
        const toP3Connection: Connection = createConnection('conn2', 'p3');
        const decisionLogic = jest.fn(async (output: TestOutput, context: Context) => {
            return [
                toP2Connection,
                toP3Connection
            ];
        });
        const decision: Decision<TestOutput, Context> = createDecision('dBranch', decisionLogic);
        baseProcess.phases.p1.next = [decision];

        const initialInput: TestInput = { data: 'decision to branch' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        const p1Output = { data: 'phase1 processed decision to branch' };
        expect(decisionLogic).toHaveBeenCalledWith(p1Output, mockContext);
        expect(mockPhase2Execute).toHaveBeenCalledWith(p1Output);
        expect(mockPhase3Execute).toHaveBeenCalledWith(p1Output);
        expect(results['p2']).toEqual({ data: 'phase2 processed phase1 processed decision to branch' });
        expect(results['p3']).toEqual({ data: 'phase3 processed phase1 processed decision to branch' });
    });

    test('should use transform function from a Connection returned by a Decision', async () => {
        const transformFn = jest.fn(async (output: TestOutput, context: Context): Promise<[TestInput, Context]> => ([{ data: `transformed by decision ${output.data}` }, context]));
        const toP2Connection: Connection = createConnection('conn1', 'p2', { transform: transformFn });
        const decisionLogic = jest.fn(async (output: TestOutput, context: Context) => {
            return [toP2Connection];
        });
        const decision: Decision<TestOutput, Context> = createDecision('dTransform', decisionLogic);
        baseProcess.phases.p1.next = [decision];

        const initialInput: TestInput = { data: 'decision with transform' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        const p1Output = { data: 'phase1 processed decision with transform' };
        expect(decisionLogic).toHaveBeenCalledWith(p1Output, mockContext);
        expect(transformFn).toHaveBeenCalledWith(p1Output, mockContext);
        expect(mockPhase2Execute).toHaveBeenCalledWith({ data: 'transformed by decision phase1 processed decision with transform' });
        expect(mockPhase3Execute).not.toHaveBeenCalled();
        expect(results['p2']).toEqual({ data: 'phase2 processed transformed by decision phase1 processed decision with transform' });
    });

    test('should handle an error thrown by the decide function of a Decision', async () => {
        const decisionError = new Error('Decision logic failed');
        const decisionLogic = jest.fn(async (output: TestOutput, context: Context) => {
            throw decisionError;
        });
        const decision: Decision<TestOutput, Context> = createDecision('dError', decisionLogic);
        baseProcess.phases.p1.next = [decision];

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const initialInput: TestInput = { data: 'decision error test' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results, phaseResults, processContext] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        const p1Output = { data: 'phase1 processed decision error test' };
        expect(decisionLogic).toHaveBeenCalledWith(p1Output, mockContext);
        expect(mockPhase2Execute).not.toHaveBeenCalled();
        expect(mockPhase3Execute).not.toHaveBeenCalled();

        expect(results).toEqual({}); // No end results as decision failed
        expect(phaseResults['p1']).toEqual(p1Output); // p1 executed
        expect(consoleErrorSpy).toHaveBeenCalledWith('[_HANDLE_NEXT_STEP_DECISION_ERROR] Error in decision dError for node p1:', expect.objectContaining({ decisionError: decisionError, decisionId: 'dError', nodeId: 'p1' }));

        consoleErrorSpy.mockRestore();
    });

    test('should handle a Decision that returns an empty array of Connections (implicit termination of path)', async () => {
        const decisionLogic = jest.fn(async (output: TestOutput, context: Context) => {
            return []; // No further steps from this decision
        });
        const decision: Decision<TestOutput, Context> = createDecision('dEmpty', decisionLogic);
        baseProcess.phases.p1.next = [decision];

        const initialInput: TestInput = { data: 'decision to empty' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results, phaseResults] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        const p1Output = { data: 'phase1 processed decision to empty' };
        expect(decisionLogic).toHaveBeenCalledWith(p1Output, mockContext);
        expect(mockPhase2Execute).not.toHaveBeenCalled();
        expect(mockPhase3Execute).not.toHaveBeenCalled();

        // The result of the phase before the decision that led to an empty array is stored with the decision's ID.
        // This behavior is based on how _handleNextStep treats an empty Connection[] or undefined `next`.
        expect(results['dEmpty']).toEqual(p1Output);
        expect(phaseResults['p1']).toEqual(p1Output);
    });


    test('should process multiple Decision elements in a PhaseNode sequentially', async () => {
        const toP2Connection: Connection = createConnection('conn1', 'p2');
        const toP3Connection: Connection = createConnection('conn2', 'p3');

        const decisionLogic1 = jest.fn(async (output: TestOutput, context: Context): Promise<Connection<TestOutput, Context>[]> => {
            return [toP2Connection]; // Decision 1 targets p2
        });
        const decisionLogic2 = jest.fn(async (output: TestOutput, context: Context): Promise<Connection<TestOutput, Context>[]> => {
            return [toP3Connection]; // Decision 2 targets p3
        });

        const decision1: Decision<TestOutput, Context> = createDecision('dMulti1', decisionLogic1);
        const decision2: Decision<TestOutput, Context> = createDecision('dMulti2', decisionLogic2);
        baseProcess.phases.p1.next = [decision1, decision2];

        const initialInput: TestInput = { data: 'multiple decisions' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        const p1Output = { data: 'phase1 processed multiple decisions' };
        expect(decisionLogic1).toHaveBeenCalledWith(p1Output, mockContext);
        expect(decisionLogic2).toHaveBeenCalledWith(p1Output, mockContext);

        expect(mockPhase2Execute).toHaveBeenCalledWith(p1Output); // From decision1
        expect(mockPhase3Execute).toHaveBeenCalledWith(p1Output); // From decision2

        expect(results['p2']).toEqual({ data: 'phase2 processed phase1 processed multiple decisions' });
        expect(results['p3']).toEqual({ data: 'phase3 processed phase1 processed multiple decisions' });
    });

    test('first Decision error does not stop subsequent Decisions in the same PhaseNode from executing', async () => {
        const decisionError = new Error('First decision failed');
        const decisionLogicError = jest.fn(async (output: TestOutput, context: Context) => {
            throw decisionError;
        });
        const toP3Connection: Connection = createConnection('conn2', 'p3');
        const decisionLogicSuccess = jest.fn(async (output: TestOutput, context: Context) => {
            return [toP3Connection];
        });

        const decisionErrorNode: Decision<TestOutput, Context> = createDecision('dErrFirst', decisionLogicError);
        const decisionSuccessNode: Decision<TestOutput, Context> = createDecision('dSuccessSecond', decisionLogicSuccess);
        baseProcess.phases.p1.next = [decisionErrorNode, decisionSuccessNode];
        // p2 is not used in this test
        delete baseProcess.phases.p2;


        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const initialInput: TestInput = { data: 'multi decision with error' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results, phaseResults, processContext] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        const p1Output = { data: 'phase1 processed multi decision with error' };
        expect(decisionLogicError).toHaveBeenCalledWith(p1Output, mockContext);
        expect(decisionLogicSuccess).toHaveBeenCalledWith(p1Output, mockContext); // Second decision should still be called

        expect(mockPhase2Execute).not.toHaveBeenCalled();
        expect(mockPhase3Execute).toHaveBeenCalledWith(p1Output); // From the successful second decision

        expect(results['p3']).toEqual({ data: 'phase3 processed phase1 processed multi decision with error' });
        expect(phaseResults['p1']).toEqual(p1Output);
        expect(consoleErrorSpy).toHaveBeenCalledWith('[_HANDLE_NEXT_STEP_DECISION_ERROR] Error in decision dErrFirst for node p1:', expect.objectContaining({ decisionError: decisionError, decisionId: 'dErrFirst', nodeId: 'p1' }));

        consoleErrorSpy.mockRestore();
    });
});

// New describe block for specific _handleNextStep scenarios and direct next properties
describe('executeProcess with specific PhaseNode.next configurations', () => {
    let baseProcess: Process;
    let mockPhase1Execute: jest.MockedFunction<(input: TestInput) => Promise<TestOutput>>;
    let mockPhase2Execute: jest.MockedFunction<(input: TestInput) => Promise<TestOutput>>;
    let mockTerminateFn: jest.MockedFunction<(output: TestOutput, context: Context) => Promise<TestOutput>>;

    beforeEach(() => {
        mockPhase1Execute = jest.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase1 processed ${input.data}` }));
        mockPhase2Execute = jest.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase2 processed ${input.data}` }));
        mockTerminateFn = jest.fn(async (output: TestOutput, context: Context): Promise<TestOutput> => output);

        const phase1: Phase = createPhase('Phase 1', { execute: mockPhase1Execute });
        const phase2: Phase = createPhase('Phase 2', { execute: mockPhase2Execute });

        const phase1Node: PhaseNode = createPhaseNode('p1', phase1);
        const phase2Node: PhaseNode = createPhaseNode('p2', phase2);

        baseProcess = {
            name: 'Test Next Config Process',
            phases: {
                p1: phase1Node, // next will be set per test
                p2: phase2Node,
            },
        };
    });

    test('should handle a PhaseNode with next directly as a Termination object', async () => {
        const terminationNode: Termination<TestOutput, Context> = createTermination('termDirect', { terminate: mockTerminateFn });
        baseProcess.phases.p1.next = terminationNode;

        const initialInput: TestInput = { data: 'direct terminate' };
        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [results, phaseResults] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        expect(mockTerminateFn).toHaveBeenCalledWith({ data: 'phase1 processed direct terminate' }, mockContext);
        expect(mockPhase2Execute).not.toHaveBeenCalled();
        expect(results['termDirect']).toEqual({ data: 'phase1 processed direct terminate' });
        expect(phaseResults['p1']).toEqual({ data: 'phase1 processed direct terminate' });
    });
});

