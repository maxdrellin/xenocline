import type { ExecutionState } from '../../src/execution/process';
import type { Context } from '../../src/context';
import type { Input } from '../../src/input';
import type { Output } from '../../src/output';
import type { Connection } from '../../src/transition/connection';
import type { Decision, DecideFunction } from '../../src/transition/decision';
import type { Termination } from '../../src/transition/termination';
import type { Phase, PhaseNode } from '../../src/xenocline';

import { jest } from '@jest/globals';

jest.mock('../../src/execution/node');
jest.mock('../../src/execution/event');
jest.mock('../../src/event');
jest.mock('../../src/execution/aggregator');

import { executeNode } from '../../src/execution/node';
import { dispatchEvent } from '../../src/execution/event';
import {
    createDecisionEvent,
    createConnectionEvent,
    createTerminationEvent
} from '../../src/event';
import { createAggregatorState } from '../../src/execution/aggregator';

import { isConnection } from '../../src/transition/connection';
import { isDecision } from '../../src/transition/decision';
import { createTermination, isTermination } from '../../src/transition/termination';
import { createPhase, createPhaseNode } from '../../src/xenocline';
import { handleNextStep } from '../../src/execution/next';

describe('handleNextStep', () => {
    let mockState: ExecutionState;
    let mockContext: Context;
    let mockOutput: Output;
    let mockPhaseNode: PhaseNode;
    let mockPhase: Phase;

    const mockExecuteNode = executeNode as jest.MockedFunction<typeof executeNode>;
    const mockDispatchEvent = dispatchEvent as jest.MockedFunction<typeof dispatchEvent>;
    const mockCreateDecisionEvent = createDecisionEvent as jest.MockedFunction<typeof createDecisionEvent>;
    const mockCreateConnectionEvent = createConnectionEvent as jest.MockedFunction<typeof createConnectionEvent>;
    const mockCreateTerminationEvent = createTerminationEvent as jest.MockedFunction<typeof createTerminationEvent>;
    const mockCreateAggregatorState = createAggregatorState as jest.MockedFunction<typeof createAggregatorState>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockCreateDecisionEvent.mockImplementation((nodeId, eventName, decision, data) => ({
            type: 'DecisionEvent',
            sourceNodeId: nodeId,
            eventName,
            decisionId: decision.id,
            data,
            timestamp: new Date(),
        } as any));

        mockCreateConnectionEvent.mockImplementation((nodeId, eventName, conn, data) => ({
            type: 'ConnectionEvent',
            sourceNodeId: nodeId,
            eventName,
            connectionId: conn.id,
            targetNodeId: conn.targetNodeId,
            data,
            timestamp: new Date(),
        } as any));

        mockCreateTerminationEvent.mockImplementation((nodeId, eventName, term, data) => ({
            type: 'TerminationEvent',
            sourceNodeId: nodeId,
            eventName,
            terminationId: term.id,
            data,
            timestamp: new Date(),
        } as any));

        mockCreateAggregatorState.mockReturnValue({
            aggregatorDeferreds: new Map(),
            registerPendingAggregator: jest.fn(),
            resolvePendingAggregator: jest.fn(),
            getPendingAggregator: jest.fn(),
            pendingAggregatorIds: jest.fn(),
        } as any);

        mockContext = {};

        mockPhase = createPhase('test-phase', {
            // @ts-ignore
            execute: jest.fn().mockResolvedValue({ data: 'test-phase-output' })
        } as any);

        mockPhaseNode = createPhaseNode('targetNode1', mockPhase);

        mockState = {
            process: { name: 'test-process', version: '1.0', phases: { 'targetNode1': mockPhaseNode } } as any,
            context: mockContext,
            results: {},
            phaseResults: {},
            errors: [],
            activeExecutions: new Map<string, Promise<Output>>(),
            eventState: {
                handlers: []
            },
            ...mockCreateAggregatorState()
        };

        mockOutput = { data: 'initial output' };
    });

    describe('Decision Handling', () => {
        it('should handle a successful decision path', async () => {
            const mockDecision: Decision<Output, Context> = {
                id: 'decision1',
                decide: jest.fn<DecideFunction<Output, Context>>().mockResolvedValue([]),
                type: 'decision',
            };

            await handleNextStep(mockOutput, 'node1', [mockDecision], mockState);

            expect(mockDecision.decide).toHaveBeenCalledWith(mockOutput, mockState.context);
            expect(mockDispatchEvent).toHaveBeenCalledTimes(3); // 'start', 'decide', and 'end' for the decision
            expect(mockCreateDecisionEvent).toHaveBeenCalledWith('node1', 'start', mockDecision, { output: mockOutput });
            expect(mockCreateDecisionEvent).toHaveBeenCalledWith('node1', 'end', mockDecision);
        });

        it('should handle an error during decision.decide', async () => {
            const decisionError = new Error('Decision failed');
            const mockDecision: Decision<Output, Context> = {
                id: 'decision1',
                decide: jest.fn<DecideFunction<Output, Context>>().mockRejectedValue(decisionError),
                type: 'decision',
            };
            // @ts-ignore
            global.console = { error: jest.fn() }; // Mock console.error

            await handleNextStep(mockOutput, 'node1', [mockDecision], mockState);

            expect(mockDecision.decide).toHaveBeenCalledWith(mockOutput, mockState.context);
            expect(mockDispatchEvent).toHaveBeenCalledTimes(1); // Only for 'start'
            expect(mockCreateDecisionEvent).toHaveBeenCalledWith('node1', 'start', mockDecision, { output: mockOutput });
            expect(console.error).toHaveBeenCalledWith(
                `[_HANDLE_NEXT_STEP_DECISION_ERROR] Error in decision ${mockDecision.id} from node node1:`,
                { decisionError, nodeId: 'node1', decisionId: mockDecision.id }
            );
            expect(mockState.errors).toEqual([{ nodeId: mockDecision.id, message: decisionError.message }]);
            expect(mockCreateDecisionEvent).not.toHaveBeenCalledWith('node1', 'end', mockDecision, expect.anything());
        });
    });

    describe('Connection Handling', () => {
        it('should handle a connection with a successful transform', async () => {
            const transformedInput = { data: 'transformed input' } as Input;
            const transformedContext = { ...mockContext, transformed: true } as Context;
            const mockTransform = jest.fn().mockImplementation(() => {
                return Promise.resolve([transformedInput, transformedContext]);
            });

            const mockConnection: Connection<Output, Context> = {
                id: 'conn1',
                targetNodeId: 'targetNode1',
                // @ts-ignore
                transform: mockTransform,
                type: 'connection',
            };
            mockExecuteNode.mockResolvedValue({ data: 'target node output' });

            await handleNextStep(mockOutput, 'node1', [mockConnection], mockState);

            expect(mockConnection.transform).toHaveBeenCalledWith(mockOutput, mockContext);
            expect(mockDispatchEvent).toHaveBeenCalledTimes(3); // start, transform, end
            expect(mockCreateConnectionEvent).toHaveBeenCalledWith('node1', 'start', mockConnection, { input: mockOutput });
            expect(mockCreateConnectionEvent).toHaveBeenCalledWith('node1', 'transform', mockConnection, { input: transformedInput, output: mockOutput, context: transformedContext });
            expect(mockCreateConnectionEvent).toHaveBeenCalledWith('node1', 'end', mockConnection);
            expect(mockExecuteNode).toHaveBeenCalledWith(mockConnection.targetNodeId, transformedInput, expect.objectContaining({ context: transformedContext }));
            expect(mockState.context).toEqual(transformedContext);
        });

        it('should handle a connection without a transform', async () => {
            const mockConnection = {
                id: 'conn1',
                targetNodeId: 'targetNode1',
                type: 'connection' as const,
                // transform is intentionally omitted
            };
            mockExecuteNode.mockResolvedValue({ data: 'target node output' });

            await handleNextStep(mockOutput, 'node1', [mockConnection as Connection<Output, Context>], mockState);

            expect(mockDispatchEvent).toHaveBeenCalledTimes(2); // start, end
            expect(mockCreateConnectionEvent).toHaveBeenCalledWith('node1', 'start', mockConnection, { input: mockOutput });
            expect(mockCreateConnectionEvent).toHaveBeenCalledWith('node1', 'end', mockConnection);
            expect(mockExecuteNode).toHaveBeenCalledWith(mockConnection.targetNodeId, mockOutput, mockState);
        });

        it('should handle an error during connection.transform', async () => {
            const transformError = new Error('Transform failed');
            const mockConnection: Connection<Output, Context> = {
                id: 'conn1',
                targetNodeId: 'targetNode1',
                // @ts-ignore
                transform: jest.fn().mockRejectedValue(transformError),
                type: 'connection',
            };
            // @ts-ignore
            global.console = { error: jest.fn() }; // Mock console.error

            await handleNextStep(mockOutput, 'node1', [mockConnection], mockState);

            expect(mockConnection.transform).toHaveBeenCalledWith(mockOutput, mockState.context);
            expect(mockDispatchEvent).toHaveBeenCalledTimes(1); // Only for 'start'
            expect(mockCreateConnectionEvent).toHaveBeenCalledWith('node1', 'start', mockConnection, { input: mockOutput });
            expect(console.error).toHaveBeenCalledWith(
                `[_HANDLE_NEXT_STEP_CONNECTION_TRANSFORM_ERROR] Error in transform for connection from node1 to ${mockConnection.targetNodeId}:`,
                { transformError, nodeId: 'node1', targetNodeId: mockConnection.targetNodeId }
            );
            expect(mockState.errors).toEqual([{ nodeId: mockConnection.targetNodeId, message: transformError.message }]);
            expect(mockExecuteNode).not.toHaveBeenCalled();
            expect(mockCreateConnectionEvent).not.toHaveBeenCalledWith('node1', 'end', mockConnection);
        });
    });

    describe('Termination Handling', () => {
        it('should handle termination with a terminate function', async () => {
            const mockTerminateFn = jest.fn();
            const mockTermination: Termination<Output, Context> = {
                id: 'term1',
                // @ts-ignore
                terminate: mockTerminateFn,
                type: 'termination'
            };
            mockCreateTerminationEvent.mockImplementation((nodeId, eventName, term, data) => ({
                type: 'TerminationEvent',
                sourceNodeId: nodeId,
                eventName,
                terminationId: term.id,
                data,
                timestamp: new Date(),
            } as any));

            await handleNextStep(mockOutput, 'node1', mockTermination, mockState);

            expect(mockDispatchEvent).toHaveBeenCalledTimes(2); // start, terminate
            expect(mockCreateTerminationEvent).toHaveBeenCalledWith('node1', 'start', mockTermination, { output: mockOutput });
            expect(mockTerminateFn).toHaveBeenCalledWith(mockOutput, mockState.context);
            expect(mockCreateTerminationEvent).toHaveBeenCalledWith('node1', 'terminate', mockTermination, { output: mockOutput });
            expect(mockState.results[mockTermination.id]).toEqual(mockOutput);
        });

        it('should handle termination without a terminate function', async () => {
            const mockTerminationNoTerminate = createTermination('term1');

            await handleNextStep(mockOutput, 'node1', mockTerminationNoTerminate as Termination<Output, Context>, mockState);

            expect(mockDispatchEvent).toHaveBeenCalledTimes(2); // Only for 'start'
            expect(mockCreateTerminationEvent).toHaveBeenCalledWith('node1', 'start', mockTerminationNoTerminate, { output: mockOutput });
            expect(mockState.results[mockTerminationNoTerminate.id]).toEqual(mockOutput);
        });
    });

    describe('Other Cases', () => {
        it('should handle an empty array for next (implicit termination)', async () => {
            const next: any[] = []; // Empty array

            await handleNextStep(mockOutput, 'node1', next, mockState);

            expect(mockState.results['node1']).toEqual(mockOutput);
            expect(mockDispatchEvent).not.toHaveBeenCalled();
            expect(mockExecuteNode).not.toHaveBeenCalled();
        });

        it('should handle undefined next (implicit termination)', async () => {
            const next = undefined;

            await handleNextStep(mockOutput, 'node1', next as any, mockState); // Cast as any to satisfy type for testing

            expect(mockState.results['node1']).toEqual(mockOutput);
            expect(mockDispatchEvent).not.toHaveBeenCalled();
            expect(mockExecuteNode).not.toHaveBeenCalled();
        });

        it('should handle null next (implicit termination)', async () => {
            const next = null;

            await handleNextStep(mockOutput, 'node1', next as any, mockState); // Cast as any to satisfy type for testing

            expect(mockState.results['node1']).toEqual(mockOutput);
            expect(mockDispatchEvent).not.toHaveBeenCalled();
            expect(mockExecuteNode).not.toHaveBeenCalled();
        });
    });
});
