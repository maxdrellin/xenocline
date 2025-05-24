import { createNode, isNode, validateNode, Node } from '../../src/node/node';
import { Next } from '../../src/transition/next';
import { createTermination, Termination } from '../../src/transition/termination';
import { Connection, createConnection } from '../../src/transition/connection';
import { createDecision, Decision } from '../../src/transition/decision';
import { Context } from '../../src/context';
import { Output } from '../../src/output';

describe('Node', () => {
    describe('createNode', () => {
        it('should create a node with the given id, type, and next', () => {
            const next: Termination<Output, Context> = createTermination('term1', { terminate: async (output, context) => ({ id: 'terminatedOutput' }) });
            const node = createNode('aggregator', 'node1', { next });
            expect(node.id).toBe('node1');
            expect(node.type).toBe('aggregator');
            expect(node.next).toEqual(next);
        });

        it('should create a phase node', () => {
            const next: Termination<Output, Context> = createTermination('term2', { terminate: async (output, context) => ({ id: 'terminatedOutput' }) });
            const node = createNode('phase', 'phaseNode', { next });
            expect(node.id).toBe('phaseNode');
            expect(node.type).toBe('phase');
            expect(node.next).toEqual(next);
        });

        it('should create a node with undefined next', () => {
            const node = createNode('phase', 'phaseNodeUndefinedNext');
            expect(node.id).toBe('phaseNodeUndefinedNext');
            expect(node.type).toBe('phase');
            expect(node.next).toBeUndefined();
        });
    });

    describe('isNode', () => {
        it('should return true for a valid aggregator node', () => {
            const next: Termination<Output, Context> = createTermination('term1', { terminate: async (output, context) => ({ id: 'terminatedOutput' }) });
            const node: Node = { id: 'agg1', type: 'aggregator', next };
            expect(isNode(node)).toBe(true);
        });

        it('should return true for a valid phase node', () => {
            const next: Termination<Output, Context> = createTermination('term2', { terminate: async (output, context) => ({ id: 'terminatedOutput' }) });
            const node: Node = { id: 'phase1', type: 'phase', next };
            expect(isNode(node)).toBe(true);
        });

        it('should return true for a valid node with undefined next', () => {
            const node: Node = { id: 'nodeWithoutNext', type: 'phase' };
            expect(isNode(node)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isNode(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isNode(undefined)).toBe(false);
        });

        it('should return false for a non-object', () => {
            expect(isNode('not an object')).toBe(false);
        });

        it('should return false if id is missing', () => {
            const node = { type: 'phase', next: { id: 't3', type: 'termination' } };
            expect(isNode(node)).toBe(false);
        });

        it('should return false if id is not a string', () => {
            const node = { id: 123, type: 'phase', next: { id: 't4', type: 'termination' } };
            expect(isNode(node)).toBe(false);
        });

        it('should return false if type is missing', () => {
            const node = { id: 'node5', next: { id: 't5', type: 'termination' } };
            expect(isNode(node)).toBe(false);
        });

        it('should return false if type is invalid', () => {
            const node = { id: 'node6', type: 'invalidType', next: { id: 't6', type: 'termination' } };
            expect(isNode(node)).toBe(false);
        });

        it('should return false if next is present but invalid', () => {
            const node = { id: 'node7', type: 'phase', next: { invalidNext: true } };
            expect(isNode(node)).toBe(false);
        });
    });

    describe('validateNode', () => {
        const validTermination: Termination<Output, Context> = createTermination('term', { terminate: async (output, context) => ({ id: 'terminatedOutput' }) });
        const validConnection: Connection<Output, Context> = createConnection('conn1', 'nextNode');
        const validDecision: Decision<Output, Context> = createDecision('dec1', async (output, context) => [validConnection]);

        it('should return an empty array for a valid aggregator node with termination', () => {
            const node: Node = { id: 'aggV1', type: 'aggregator', next: validTermination };
            expect(validateNode(node)).toEqual([]);
        });

        it('should return an empty array for a valid phase node with connections', () => {
            const node: Node = { id: 'phaseV1', type: 'phase', next: [validConnection] };
            expect(validateNode(node)).toEqual([]);
        });

        it('should return an empty array for a valid phase node with decisions', () => {
            const node: Node = { id: 'phaseV2', type: 'phase', next: [validDecision] };
            expect(validateNode(node)).toEqual([]);
        });

        it('should return an empty array for a valid node with undefined next', () => {
            const node: Node = { id: 'nodeVNoNext', type: 'phase' };
            expect(validateNode(node)).toEqual([]);
        });

        it('should return an error if node is undefined', () => {
            const errors = validateNode(undefined);
            expect(errors.length).toBe(1);
            expect(errors[0].coordinates).toEqual(['Node']);
            expect(errors[0].error).toBe('Node is undefined or null.');
        });

        it('should return an error if node is null', () => {
            const errors = validateNode(null);
            expect(errors.length).toBe(1);
            expect(errors[0].coordinates).toEqual(['Node']);
            expect(errors[0].error).toBe('Node is undefined or null.');
        });

        it('should return an error if node is not an object', () => {
            const errors = validateNode('not a node');
            expect(errors.length).toBe(1);
            expect(errors[0].coordinates).toEqual(['Node']);
            expect(errors[0].error).toBe('Node is not an object.');
        });

        it('should return an error if id is missing', () => {
            const node = { type: 'phase' };
            const errors = validateNode(node);
            expect(errors.length).toBeGreaterThanOrEqual(1);
            expect(errors).toContainEqual({ coordinates: ['Node'], error: 'Node id is undefined or not a string.' });
        });

        it('should return an error if id is not a string', () => {
            const node = { id: 123, type: 'phase' };
            const errors = validateNode(node);
            expect(errors.length).toBeGreaterThanOrEqual(1);
            expect(errors).toContainEqual({ coordinates: ['Node'], error: 'Node id is undefined or not a string.' });
        });

        it('should return an error if type is missing', () => {
            const node = { id: 'nodeX1' };
            const errors = validateNode(node);
            expect(errors.length).toBeGreaterThanOrEqual(1);
            expect(errors).toContainEqual({ coordinates: ['Node'], error: 'Node type is undefined or not a string.' });
        });

        it('should return an error if type is invalid', () => {
            const node = { id: 'nodeX2', type: 'invalid' };
            const errors = validateNode(node);
            expect(errors.length).toBeGreaterThanOrEqual(1);
            expect(errors).toContainEqual({ coordinates: ['Node'], error: 'Node type is not a valid type.' });
        });

        it('should propagate errors from validateNext for invalid next object', () => {
            const node = { id: 'nodeX3', type: 'phase', next: { type: 'invalid' } }; // Invalid next
            const errors = validateNode(node);
            expect(errors.length).toBeGreaterThan(0);
            // Check for a specific error from validateNext (e.g., related to Termination validation)
            expect(errors.some(e => e.coordinates.includes('Next') && e.coordinates.includes('Termination'))).toBe(true);
        });

        it('should propagate errors from validateNext for invalid array of connections', () => {
            const node = { id: 'nodeX4', type: 'phase', next: [{ id: 'c1', type: 'connection' }, { type: 'decision' }] }; // Mixed types
            const errors = validateNode(node);
            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some(e => e.coordinates.includes('Next') && e.error.includes('Next Array contains invalid element types'))).toBe(true);
        });

        it('should include node id in coordinates for errors within next', () => {
            const node = { id: 'testNodeId', type: 'phase', next: { type: 'invalid' } };
            const errors = validateNode(node);
            expect(errors.every(e => e.coordinates.includes('Node: testNodeId'))).toBe(true);
        });
    });
});
