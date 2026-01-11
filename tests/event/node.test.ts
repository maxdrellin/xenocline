import { describe,it,expect } from 'vitest';
import { AggregatorNode, PhaseNode } from '../../src/xenocline';
import {
    createAggregatorNodeEvent,
    createNodeEvent,
    createPhaseNodeEvent,
    isAggregatorNodeEvent,
    isNodeEvent,
    isPhaseNodeEvent,
} from '../../src/event/node';
import type { NodeEventStage, NodeEventType } from '../../src/event/node';
import type { Phase } from '../../src/phase';
import type { Aggregator } from '../../src/aggregator';
import type { Input } from '../../src/input';
import type { Output } from '../../src/output';
import type { Context } from '../../src/context';

// Minimal mock for Input, Output, and Context
const mockInput: Input = { id: 'input1' };
const mockOutput: Output = { id: 'output1' };
const mockContext: Context = { traceId: 'trace-123' };

describe('NodeEvent', () => {
    // Minimal mock for Phase
    const mockPhase: Phase = {
        name: 'Test Phase Logic',
        execute: async (input: Input) => mockOutput,
    };

    // Minimal mock for Aggregator
    const mockAggregator: Aggregator = {
        name: 'Test Aggregator Logic',
        aggregate: async (input: Input, context: Context) => ({ status: 'Ready', output: mockOutput }),
    };

    const mockAggregatorNode: AggregatorNode = { id: 'aggregator1', type: 'aggregator', aggregator: mockAggregator };
    const mockPhaseNode: PhaseNode = { id: 'phase1', type: 'phase', phase: mockPhase } as PhaseNode;
    const sourceId = 'test-source';
    const mockBasicNodeObject = { id: 'basicNode' };

    describe('createNodeEvent', () => {
        it('should create a valid NodeEvent for an aggregator type', () => {
            const stage: NodeEventStage = 'start';
            const nodeType: NodeEventType = 'aggregator';
            const event = createNodeEvent(sourceId, nodeType, stage, mockAggregatorNode);

            expect(event.sourceId).toBe(sourceId);
            expect(event.type).toBe('node');
            expect(event.nodeType).toBe(nodeType);
            expect(event.node).toBe(mockAggregatorNode);
            expect(event.stage).toBe(stage);
            expect(event.date).toBeInstanceOf(Date);
        });

        it('should create a valid NodeEvent for a phase type', () => {
            const stage: NodeEventStage = 'end';
            const nodeType: NodeEventType = 'phase';
            const event = createNodeEvent(sourceId, nodeType, stage, mockPhaseNode);

            expect(event.sourceId).toBe(sourceId);
            expect(event.type).toBe('node');
            expect(event.nodeType).toBe(nodeType);
            expect(event.node).toBe(mockPhaseNode);
            expect(event.stage).toBe(stage);
            expect(event.date).toBeInstanceOf(Date);
        });
    });

    describe('isNodeEvent', () => {
        it('should return true for a valid NodeEvent (aggregator)', () => {
            const event = createNodeEvent(sourceId, 'aggregator', 'start', mockAggregatorNode);
            expect(isNodeEvent(event)).toBe(true);
        });

        it('should return true for a valid NodeEvent (phase)', () => {
            const event = createNodeEvent(sourceId, 'phase', 'end', mockPhaseNode);
            expect(isNodeEvent(event)).toBe(true);
        });

        it('should return false for an invalid event object', () => {
            expect(isNodeEvent(null)).toBe(false);
            expect(isNodeEvent(undefined)).toBe(false);
            expect(isNodeEvent({})).toBe(false);
            expect(isNodeEvent({ type: 'node' })).toBe(false);
            expect(isNodeEvent({ type: 'node', node: mockBasicNodeObject })).toBe(false);
            expect(isNodeEvent({ type: 'node', node: mockBasicNodeObject, stage: 'start' })).toBe(true);
        });

        it('should return false for an event of a different type', () => {
            const otherEvent = { type: 'other', node: mockBasicNodeObject, stage: 'start' };
            expect(isNodeEvent(otherEvent)).toBe(false);
        });
    });

    describe('createAggregatorNodeEvent', () => {
        it('should create a valid AggregatorNodeEvent', () => {
            const stage: NodeEventStage = 'start';
            const event = createAggregatorNodeEvent(sourceId, stage, mockAggregatorNode);

            expect(event.sourceId).toBe(sourceId);
            expect(event.type).toBe('node');
            expect(event.nodeType).toBe('aggregator');
            expect(event.node).toBe(mockAggregatorNode);
            expect(event.stage).toBe(stage);
            expect(event.date).toBeInstanceOf(Date);
        });
    });

    describe('isAggregatorNodeEvent', () => {
        it('should return true for a valid AggregatorNodeEvent', () => {
            const event = createAggregatorNodeEvent(sourceId, 'end', mockAggregatorNode);
            expect(isAggregatorNodeEvent(event)).toBe(true);
        });

        it('should return false if NodeEvent check fails', () => {
            const invalidEvent = { type: 'not-node', nodeType: 'aggregator', node: mockAggregatorNode, stage: 'start' };
            expect(isAggregatorNodeEvent(invalidEvent)).toBe(false);
        });

        it('should return false if nodeType is not aggregator', () => {
            const event = createNodeEvent(sourceId, 'phase', 'start', mockPhaseNode); // A phase node event
            expect(isAggregatorNodeEvent(event)).toBe(false);
        });

        it('should return false for a generic NodeEvent that happens to have an aggregator node but wrong nodeType', () => {
            const genericEventWithAggregatorNode = {
                sourceId,
                type: 'node',
                nodeType: 'phase', // Incorrect nodeType for this check
                node: mockAggregatorNode,
                stage: 'start',
                date: new Date(),
            };
            expect(isAggregatorNodeEvent(genericEventWithAggregatorNode)).toBe(false);
        });

        it('should return false for a basic NodeEvent missing specific aggregator properties', () => {
            const basicNodeEvent = createNodeEvent(sourceId, 'aggregator', 'start', mockAggregatorNode as any); // Cast to satisfy createNodeEvent
            // Manually override to make it not an AggregatorNodeEvent for the purpose of this test, e.g. by removing nodeType
            const modifiedEvent = { ...basicNodeEvent };
            delete (modifiedEvent as any).nodeType; // isNodeEvent would still be true, but isAggregatorNodeEvent requires nodeType
            expect(isAggregatorNodeEvent(modifiedEvent)).toBe(false);
        });
    });

    describe('createPhaseNodeEvent', () => {
        it('should create a valid PhaseNodeEvent', () => {
            const stage: NodeEventStage = 'end';
            const event = createPhaseNodeEvent(sourceId, stage, mockPhaseNode);

            expect(event.sourceId).toBe(sourceId);
            expect(event.type).toBe('node');
            expect(event.nodeType).toBe('phase');
            expect(event.node).toBe(mockPhaseNode);
            expect(event.stage).toBe(stage);
            expect(event.date).toBeInstanceOf(Date);
        });
    });

    describe('isPhaseNodeEvent', () => {
        it('should return true for a valid PhaseNodeEvent', () => {
            const event = createPhaseNodeEvent(sourceId, 'start', mockPhaseNode);
            expect(isPhaseNodeEvent(event)).toBe(true);
        });

        it('should return false if NodeEvent check fails', () => {
            const invalidEvent = { type: 'not-node', nodeType: 'phase', node: mockPhaseNode, stage: 'start' };
            expect(isPhaseNodeEvent(invalidEvent)).toBe(false);
        });

        it('should return false if nodeType is not phase', () => {
            const event = createNodeEvent(sourceId, 'aggregator', 'end', mockAggregatorNode); // An aggregator node event
            expect(isPhaseNodeEvent(event)).toBe(false);
        });

        it('should return false for a generic NodeEvent that happens to have a phase node but wrong nodeType', () => {
            const genericEventWithPhaseNode = {
                sourceId,
                type: 'node',
                nodeType: 'aggregator', // Incorrect nodeType for this check
                node: mockPhaseNode,
                stage: 'start',
                date: new Date(),
            };
            expect(isPhaseNodeEvent(genericEventWithPhaseNode)).toBe(false);
        });

        it('should return false for a basic NodeEvent missing specific phase properties', () => {
            const basicNodeEvent = createNodeEvent(sourceId, 'phase', 'end', mockPhaseNode as any); // Cast to satisfy createNodeEvent
            const modifiedEvent = { ...basicNodeEvent };
            delete (modifiedEvent as any).nodeType; // isNodeEvent would still be true, but isPhaseNodeEvent requires nodeType
            expect(isPhaseNodeEvent(modifiedEvent)).toBe(false);
        });
    });
});
