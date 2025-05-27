import { executePhase } from '../../src/execution/phase';
import { PhaseNode } from '../../src/node/phasenode';
import { Input } from '../../src/input';
import { Output } from '../../src/output';
import { ExecutionState } from '../../src/execution/process';
import { createEventState } from '../../src/execution/event';

// Mock dispatchEvent to avoid side effects
jest.mock('../../src/execution/event', () => ({
    ...jest.requireActual('../../src/execution/event'),
    dispatchEvent: jest.fn(),
}));

const mockProcess = { name: 'mockProcess', phases: {} } as any;

const baseState = (): ExecutionState => ({
    process: mockProcess,
    context: {},
    phaseResults: {},
    results: {},
    activeExecutions: new Map(),
    errors: [],
    aggregatorDeferreds: new Map(),
    registerPendingAggregator: jest.fn(),
    resolvePendingAggregator: jest.fn(),
    getPendingAggregator: jest.fn(),
    pendingAggregatorIds: jest.fn(),
    eventState: createEventState([]),
});

describe('executePhase', () => {
    const nodeId = 'node1';
    const input: Input = { foo: 'bar' };
    const output: Output = { result: 42 };

    it('calls verify and proceeds when verify passes', async () => {
        const phase = {
            name: 'test',
            execute: jest.fn().mockResolvedValue(output),
            verify: jest.fn().mockResolvedValue({ verified: true, messages: [] }),
        };
        const node: PhaseNode = { id: nodeId, type: 'phase', phase };
        const state = baseState();
        const result = await executePhase(nodeId, node, input, state);
        expect(phase.verify).toHaveBeenCalledWith(input);
        expect(phase.execute).toHaveBeenCalledWith(input);
        expect(result).toBe(output);
    });

    it('calls verify and throws when verify fails', async () => {
        const phase = {
            name: 'test',
            execute: jest.fn(),
            verify: jest.fn().mockResolvedValue({ verified: false, messages: ['bad input', 'another error'] }),
        };
        const node: PhaseNode = { id: nodeId, type: 'phase', phase };
        const state = baseState();
        await expect(executePhase(nodeId, node, input, state)).rejects.toThrow('bad input\nanother error');
        expect(phase.verify).toHaveBeenCalledWith(input);
        expect(phase.execute).not.toHaveBeenCalled();
    });

    it('does not call verify if not present', async () => {
        const phase = {
            name: 'test',
            execute: jest.fn().mockResolvedValue(output),
        };
        const node: PhaseNode = { id: nodeId, type: 'phase', phase };
        const state = baseState();
        const result = await executePhase(nodeId, node, input, state);
        expect(phase.execute).toHaveBeenCalledWith(input);
        expect(result).toBe(output);
    });
});
