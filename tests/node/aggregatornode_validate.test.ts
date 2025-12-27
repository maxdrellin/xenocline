import { vi } from 'vitest';
import { AggregatorNode, validateAggregatorNode } from '../../src/node/aggregatornode';
import { Aggregator } from '../../src/aggregator';
import { Termination } from '../../src/transition/termination';
import { Output } from '../../src/output';
import { Context } from '../../src/context';

// Mock implementations
const mockAggregate = async (input: any, context: Context): Promise<any> => {
    return { status: 'Ready', output: { id: 'output1' } };
};

const mockTermination: Termination<Output, Context> = {
    id: 'term1',
    type: 'termination',
    terminate: async (output: Output, context: Context) => ({ id: 'terminatedOutput' }),
};

const mockAggregator: Aggregator = {
    name: 'mockAggregator',
    aggregate: mockAggregate,
};

describe('validateAggregatorNode', () => {
    it('should return no errors for a valid AggregatorNode', () => {
        const node: AggregatorNode = {
            id: 'node1',
            type: 'aggregator',
            aggregator: mockAggregator,
            next: mockTermination,
        };

        const errors = validateAggregatorNode(node);
        expect(errors).toHaveLength(0);
    });

    it('should return errors when aggregator is undefined', () => {
        const node = {
            id: 'node1',
            type: 'aggregator',
            next: mockTermination,
        };

        const errors = validateAggregatorNode(node);
        expect(errors).toHaveLength(1);
        expect(errors[0].error).toBe('aggregator is undefined.');
    });

    it('should return errors when aggregator validation fails', () => {
        const invalidAggregator = {
            name: 'invalidAggregator',
            // Missing aggregate function
        };

        const node = {
            id: 'node1',
            type: 'aggregator',
            aggregator: invalidAggregator,
            next: mockTermination,
        };

        const errors = validateAggregatorNode(node);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.error.includes('aggregate'))).toBe(true);
    });

    it('should include coordinates in error messages', () => {
        const node = {
            id: 'node1',
            type: 'aggregator',
            // Missing aggregator
        };

        const errors = validateAggregatorNode(node, ['root']);
        expect(errors[0].coordinates).toEqual(['root', 'AggregatorNode', 'AggregatorNode: node1']);
    });
});
