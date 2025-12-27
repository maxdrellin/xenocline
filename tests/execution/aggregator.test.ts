import { vi } from 'vitest';
import { executeProcess } from '../../src/execution/process';
import { Phase } from '../../src/phase';
import { PhaseNode } from '../../src/node/phasenode';
import { Process } from '../../src/process';
import { Context } from '../../src/context';
import { Output } from '../../src/output';
import { Input } from '../../src/input';
import { AggregatorNode } from '../../src/node/aggregatornode';
import { Aggregator } from '../../src/aggregator';
import { Connection } from '../../src/transition/connection';
import { Beginning, createBeginning } from '../../src/transition/beginning';

const mockContext: Context = {};

interface TestInput extends Input {
    data?: any;
    [key: string]: any;
}

interface TestOutput extends Output {
    data?: any;
    [key: string]: any;
}

// New describe block for AggregatorNode tests
describe('executeProcess with AggregatorNode', () => {
    let baseProcess: Process;
    let mockPhase1Execute: ReturnType<typeof vi.fn>;
    let mockPhase2Execute: ReturnType<typeof vi.fn>;
    let mockAggregatorExecute: ReturnType<typeof vi.fn>;
    let mockAggregator: Aggregator;

    interface AggregationTestInput extends Input {
        items?: string[];
        triggerReady?: boolean;
        [key: string]: any;
    }

    interface AggregationTestOutput extends Output {
        summary?: string;
        [key: string]: any;
    }

    type AggregationResult<O> =
        | { status: 'Ready'; output: O }
        | { status: 'NotYetReady' };


    beforeEach(() => {
        mockPhase1Execute = vi.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase1 processed ${input.data}` }));
        mockPhase2Execute = vi.fn(async (input: TestInput): Promise<TestOutput> => ({ data: `phase2 processed ${input.data}` }));
        mockAggregatorExecute = vi.fn(async (input: AggregationTestInput, context: Context): Promise<AggregationResult<AggregationTestOutput>> => {
            if (input.triggerReady) {
                return { status: 'Ready', output: { summary: `aggregated ${input.items?.join(', ')}` } };
            }
            return { status: 'NotYetReady' };
        });
        mockAggregator = {
            name: 'mockAggregator',
            aggregate: mockAggregatorExecute,
        };


        const phase1: Phase = { name: 'Phase 1', execute: mockPhase1Execute };
        const phase2: Phase = { name: 'Phase 2', execute: mockPhase2Execute };

        baseProcess = {
            name: 'Test Aggregator Process',
            phases: {
                p1: {
                    id: 'p1',
                    type: 'phase',
                    phase: phase1,
                    next: [{ id: 'conn1', type: 'connection', targetNodeId: 'agg1' } as Connection]
                } as PhaseNode<TestInput, TestOutput>,
                agg1: {
                    id: 'agg1',
                    type: 'aggregator',
                    aggregator: mockAggregator,
                    next: [{ id: 'conn2', type: 'connection', targetNodeId: 'p2' } as Connection]
                } as AggregatorNode<AggregationTestOutput, Context>,
                p2: {
                    id: 'p2',
                    type: 'phase',
                    phase: phase2,
                    isEndPhase: true
                } as PhaseNode,
            },
        };
    });

    test('should execute process with AggregatorNode returning Ready', async () => {
        const initialInput: TestInput = { data: 'start' };
        // The mockAggregatorExecute is set up in beforeEach to return Ready
        // if input.triggerReady is true. The input to the aggregator comes from p1.
        // So we need to ensure p1 output sets this, or modify the aggregator input directly.
        // For simplicity in this test, let's assume the input to the aggregator node will have `triggerReady: true`.
        // The output of p1 will be the input to agg1.
        // We can modify p1's output or, more directly, ensure the mockAggregatorExecute receives the correct trigger.

        // Redefine mockPhase1Execute to pass triggerReady to aggregator
        mockPhase1Execute.mockImplementation(async (input: TestInput): Promise<TestInput & { triggerReady: boolean, items: string[] }> => {
            return { data: `phase1 processed ${input.data}`, triggerReady: true, items: ['item1', 'item2'] };
        });

        // Redefine mockPhase2Execute for this specific test case
        // to correctly handle the output from the aggregator.
        mockPhase2Execute.mockImplementation(async (input: AggregationTestOutput): Promise<TestOutput> => {
            return { data: `phase2 processed ${input.summary}` };
        });

        const beginning: Beginning<Input, Context> = createBeginning('p1', 'p1');
        const [endResults, phaseResults, context] = await executeProcess(baseProcess, beginning, { input: initialInput });

        expect(mockPhase1Execute).toHaveBeenCalledWith(initialInput);
        const p1Output = { data: 'phase1 processed start', triggerReady: true, items: ['item1', 'item2'] };
        expect(mockAggregatorExecute).toHaveBeenCalledWith(p1Output, mockContext);
        expect(mockPhase2Execute).toHaveBeenCalledWith({ summary: 'aggregated item1, item2' });

        expect(endResults['p2']).toEqual({ data: 'phase2 processed aggregated item1, item2' });
        expect(phaseResults['p1']).toEqual(p1Output);
        expect(phaseResults['agg1']).toEqual({ summary: 'aggregated item1, item2' });
    });

    // Tests will be added here
});
