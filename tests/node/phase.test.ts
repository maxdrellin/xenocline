import { vi, describe, it, expect } from 'vitest';
import { executePhase } from '../../src/execution/phase';
import { PhaseNode } from '../../src/node/phasenode';
import { Input } from '../../src/input';
import { Output } from '../../src/output';
import { Context } from '../../src/context';
import { ExecutionState } from '../../src/execution/process';
import { createEventState } from '../../src/execution/event';

// Mock dispatchEvent to avoid side effects
vi.mock('../../src/execution/event', async () => {
    const actual = await vi.importActual<typeof import('../../src/execution/event')>('../../src/execution/event');
    return {
        ...actual,
        dispatchEvent: vi.fn(),
    };
});

const mockProcess = { name: 'mockProcess', phases: {} } as any;

const baseState = (): ExecutionState => ({
    process: mockProcess,
    context: {},
    phaseResults: {},
    results: {},
    activeExecutions: new Map(),
    errors: [],
    aggregatorDeferreds: new Map(),
    registerPendingAggregator: vi.fn(),
    resolvePendingAggregator: vi.fn(),
    getPendingAggregator: vi.fn(),
    pendingAggregatorIds: vi.fn(),
    eventState: createEventState([]),
});

describe('executePhase', () => {
    const nodeId = 'node1';
    const input: Input = { foo: 'bar' };
    const output: Output = { result: 42 };
    const context: Context = { user: 'alice' };

    it('executes phase without prepare or verify', async () => {
        const phase = { name: 'test', execute: vi.fn().mockResolvedValue(output) };
        const node: PhaseNode = { id: nodeId, type: 'phase', phase };
        const state = baseState();
        const result = await executePhase(nodeId, node, input, state);
        expect(phase.execute).toHaveBeenCalledWith(input);
        expect(result).toBe(output);
    });

    it('executes phase with prepare', async () => {
        const phase = { name: 'test', execute: vi.fn().mockResolvedValue(output) };
        const prepare = vi.fn().mockResolvedValue([{ foo: 'baz' }, { user: 'bob' }]);
        const node: PhaseNode = { id: nodeId, type: 'phase', phase, prepare };
        const state = baseState();
        state.context = context;
        const result = await executePhase(nodeId, node, input, state);
        expect(prepare).not.toHaveBeenCalled();
        expect(phase.execute).toHaveBeenCalledWith({ foo: 'bar' });
        expect(state.context).toEqual({ user: 'alice' });
        expect(result).toBe(output);
    });

    it('executes phase with verify (success)', async () => {
        const phase = {
            name: 'test',
            execute: vi.fn().mockResolvedValue(output),
            verify: vi.fn().mockResolvedValue({ verified: true, messages: [] }),
        };
        const node: PhaseNode = { id: nodeId, type: 'phase', phase };
        const state = baseState();
        const result = await executePhase(nodeId, node, input, state);
        expect(phase.verify).toHaveBeenCalledWith(input);
        expect(phase.execute).toHaveBeenCalledWith(input);
        expect(result).toBe(output);
    });

    it('throws if verify fails', async () => {
        const phase = {
            name: 'test',
            execute: vi.fn(),
            verify: vi.fn().mockResolvedValue({ verified: false, messages: ['bad input', 'another error'] }),
        };
        const node: PhaseNode = { id: nodeId, type: 'phase', phase };
        const state = baseState();
        await expect(executePhase(nodeId, node, input, state)).rejects.toThrow('bad input\nanother error');
        expect(phase.verify).toHaveBeenCalledWith(input);
        expect(phase.execute).not.toHaveBeenCalled();
    });

    it('executes phase with both prepare and verify', async () => {
        const phase = {
            name: 'test',
            execute: vi.fn().mockResolvedValue(output),
            verify: vi.fn().mockResolvedValue({ verified: true, messages: [] }),
        };
        const prepare = vi.fn().mockResolvedValue([{ foo: 'baz' }, { user: 'bob' }]);
        const node: PhaseNode = { id: nodeId, type: 'phase', phase, prepare };
        const state = baseState();
        state.context = context;
        const result = await executePhase(nodeId, node, input, state);
        expect(prepare).not.toHaveBeenCalled();
        expect(phase.verify).toHaveBeenCalledWith({ foo: 'bar' });
        expect(phase.execute).toHaveBeenCalledWith({ foo: 'bar' });
        expect(state.context).toEqual({ user: 'alice' });
        expect(result).toBe(output);
    });
});
