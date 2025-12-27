import { AggregatorNode, isAggregatorNode, createAggregatorNode, validateAggregatorNode } from '../../src/node/aggregatornode';
import { AggregationResult, Aggregator, createAggregator, validateAggregator } from '../../src/aggregator';
import { createTermination, Termination } from '../../src/transition/termination';
import { Connection } from '../../src/transition/connection';
import { Decision, createDecision } from '../../src/transition/decision';
import { Input } from '../../src/input';
import { Output } from '../../src/output';
import { Context } from '../../src/context';
import { validateNode } from '../../src/node/node';
import { vi } from 'vitest'
import { createConnection } from '../../src/transition/connection';

// Mock implementations for dependent types
const mockAggregate = async (input: Input, context: Context): Promise<AggregationResult<Output>> => {
    return { status: 'Ready', output: { id: 'output1' } };
};

const mockTermination: Termination<Output, Context> = createTermination('term1', {
    terminate: async (output: Output, context: Context) => ({ id: 'terminatedOutput' }),
});

const mockConnection: Connection<Output, Context> = createConnection('conn1', 'phase2');

const mockDecision: Decision<Output, Context> = createDecision('dec1', async (output: Output, context: Context) => {
    if (output.id === 'output1') {
        return [{ id: 'conn1', type: 'connection', targetNodeId: 'phaseA' } as Connection];
    }
    return mockTermination;
});

const mockAggregator: Aggregator = createAggregator('mockAggregator', { aggregate: mockAggregate });

describe('isAggregatorNode', () => {
    // Valid cases
    it('should return true for a valid AggregatorNode with Termination', () => {
        const node: AggregatorNode = {
            id: 'node1',
            type: 'aggregator',
            aggregator: mockAggregator,
            next: mockTermination,
        };
        expect(isAggregatorNode(node)).toBe(true);
    });

    it('should return true for a valid AggregatorNode with an empty Connection array', () => {
        const node: AggregatorNode = {
            id: 'node2',
            type: 'aggregator',
            aggregator: mockAggregator,
        };
        expect(isAggregatorNode(node)).toBe(true);
    });

    it('should return true for a valid AggregatorNode with Connection[]', () => {
        const node: AggregatorNode = {
            id: 'node3',
            type: 'aggregator',
            aggregator: mockAggregator,
            next: [mockConnection],
        };
        expect(isAggregatorNode(node)).toBe(true);
    });

    it('should return true for a valid AggregatorNode with an empty Decision array', () => {
        // Note: An empty array is ambiguous by itself, but isAggregatorNode handles it.
        const node: AggregatorNode = {
            id: 'node4',
            type: 'aggregator',
            aggregator: mockAggregator,
        };
        expect(isAggregatorNode(node)).toBe(true);
    });

    it('should return true for a valid AggregatorNode with Decision[]', () => {
        const node: AggregatorNode = {
            id: 'node5',
            type: 'aggregator',
            aggregator: mockAggregator,
            next: [mockDecision],
        };
        expect(isAggregatorNode(node)).toBe(true);
    });

    // Invalid cases
    it('should return false for null', () => {
        expect(isAggregatorNode(null)).toBe(false);
    });

    it('should return false for undefined', () => {
        expect(isAggregatorNode(undefined)).toBe(false);
    });

    it('should return false for a non-object type (number)', () => {
        expect(isAggregatorNode(123)).toBe(false);
    });

    it('should return false for a non-object type (string)', () => {
        expect(isAggregatorNode('not a node')).toBe(false);
    });

    it('should return false if id is missing', () => {
        const node = {
            aggregate: mockAggregate,
            next: mockTermination,
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if id is not a string', () => {
        const node = {
            id: 123,
            aggregate: mockAggregate,
            next: mockTermination,
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if aggregate function is missing', () => {
        const node = {
            id: 'node6',
            next: mockTermination,
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if aggregate is not a function', () => {
        const node = {
            id: 'node7',
            aggregate: 'not a function',
            next: mockTermination,
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if next is missing', () => {
        const node = {
            id: 'node8',
            aggregate: mockAggregate,
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if next is not an object, array, or Termination', () => {
        const node = {
            id: 'node9',
            aggregate: mockAggregate,
            next: 'not valid next',
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if next is an array of numbers', () => {
        const node = {
            id: 'node10',
            aggregate: mockAggregate,
            next: [1, 2, 3],
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if next is an array with mixed valid and invalid types', () => {
        const node = {
            id: 'node11',
            aggregate: mockAggregate,
            next: [mockConnection, { random: 'object' }],
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if next is an array of non-Connection/non-Decision objects', () => {
        const node = {
            id: 'node12',
            aggregate: mockAggregate,
            next: [{ random: 'object1' }, { random: 'object2' }],
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if next is an array with mixed Connection and Decision objects', () => {
        const node = {
            id: 'node13',
            aggregate: mockAggregate,
            next: [mockConnection, mockDecision],
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false for an object that is a valid Termination but not an AggregatorNode', () => {
        expect(isAggregatorNode(mockTermination)).toBe(false);
    });

    it('should return false for an object that is a valid Connection but not an AggregatorNode', () => {
        expect(isAggregatorNode(mockConnection)).toBe(false);
    });

    it('should return false for an object that is a valid Decision but not an AggregatorNode', () => {
        expect(isAggregatorNode(mockDecision)).toBe(false);
    });

    it('should return false for a valid Node with a different type', () => {
        const node = {
            id: 'nodeX',
            type: 'transformer', // Not 'aggregator'
            aggregator: mockAggregator,
            next: mockTermination,
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if aggregator is null', () => {
        const node = {
            id: 'nodeY',
            type: 'aggregator',
            aggregator: null,
            next: mockTermination,
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if aggregator.aggregate is not a function', () => {
        const node = {
            id: 'nodeZ',
            type: 'aggregator',
            aggregator: { name: 'test', aggregate: 'not-a-function' },
            next: mockTermination,
        };
        expect(isAggregatorNode(node)).toBe(false);
    });

    it('should return false if aggregator.aggregate is missing', () => {
        const node = {
            id: 'nodeW',
            type: 'aggregator',
            aggregator: { name: 'test' }, // aggregate function is missing
            next: mockTermination,
        };
        expect(isAggregatorNode(node)).toBe(false);
    });
});

describe('createAggregatorNode', () => {
    it('should create an AggregatorNode with Termination', () => {
        const node = createAggregatorNode('newNode1', mockAggregator, { next: mockTermination });
        expect(node.id).toBe('newNode1');
        expect(node.type).toBe('aggregator');
        expect(node.aggregator).toBe(mockAggregator);
        expect(node.next).toBe(mockTermination);
    });

    it('should create an AggregatorNode with Connection[]', () => {
        const connections = [mockConnection] as const;
        const node = createAggregatorNode('newNode2', mockAggregator, { next: connections });
        expect(node.id).toBe('newNode2');
        expect(node.type).toBe('aggregator');
        expect(node.aggregator).toBe(mockAggregator);
        expect(node.next).toBe(connections);
    });

    it('should create an AggregatorNode with Decision[]', () => {
        const decisions = [mockDecision] as const;
        const node = createAggregatorNode('newNode3', mockAggregator, { next: decisions });
        expect(node.id).toBe('newNode3');
        expect(node.type).toBe('aggregator');
        expect(node.aggregator).toBe(mockAggregator);
        expect(node.next).toBe(decisions);
    });
});