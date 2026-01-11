import { describe,it,expect } from 'vitest';
import { createConnection, isConnection, validateConnection, Connection, TransformFunction } from '../../src/transition/connection';
import { Context } from '../../src/context';
import { Output } from '../../src/output';
import { Input } from '../../src/input';

describe('Connection', () => {
    const mockTransformFunction: TransformFunction = async (output: Output, context: Context): Promise<[Input, Context]> => {
        return Promise.resolve([{ data: output.status }, context]);
    };

    describe('createConnection', () => {
        it('should create a connection object with id, targetNodeId, and optional transform', () => {
            const conn1 = createConnection('conn1', 'nodeA');
            expect(conn1.id).toBe('conn1');
            expect(conn1.type).toBe('connection');
            expect(conn1.targetNodeId).toBe('nodeA');

            const conn2 = createConnection('conn2', 'nodeB', { transform: mockTransformFunction });
            expect(conn2.id).toBe('conn2');
            expect(conn2.type).toBe('connection');
            expect(conn2.targetNodeId).toBe('nodeB');
            expect(conn2.transform).toBe(mockTransformFunction);
        });
    });

    describe('isConnection', () => {
        it('should return true for a valid connection object', () => {
            const conn = { id: 'c1', type: 'connection', targetNodeId: 'n1' };
            expect(isConnection(conn)).toBe(true);
        });

        it('should return false for an invalid connection object', () => {
            expect(isConnection(null)).toBe(false);
            expect(isConnection({})).toBe(false);
            expect(isConnection({ id: 'c1', type: 'connection' })).toBe(false); // Missing targetNodeId
            expect(isConnection({ id: 'c1', type: 'decision', targetNodeId: 'n1' })).toBe(false); // Wrong type
        });
    });

    describe('validateConnection', () => {
        it('should return an empty array for a valid connection object', () => {
            const conn1: Connection = createConnection('c1', 'n1');
            expect(validateConnection(conn1)).toEqual([]);
            const conn2: Connection = createConnection('c2', 'n2', { transform: mockTransformFunction });
            expect(validateConnection(conn2)).toEqual([]);
        });

        it('should return errors from validateTransition for null, undefined, or non-object input', () => {
            expect(validateConnection(null)).toEqual([{ coordinates: ['Transition'], error: 'Transition is undefined or null.' }]);
            expect(validateConnection(undefined)).toEqual([{ coordinates: ['Transition'], error: 'Transition is undefined or null.' }]);
            expect(validateConnection('not-an-object')).toEqual([{ coordinates: ['Transition'], error: 'Transition is not an object.' }]);
        });

        it('should return errors from validateTransition for an empty object', () => {
            expect(validateConnection({})).toEqual([
                { coordinates: ['Transition'], error: 'Transition id is undefined or not a string.' },
                { coordinates: ['Transition'], error: 'Transition type is undefined or not a string.' },
                { coordinates: ['Transition'], error: 'Transition type is not a valid type.' },
                { coordinates: ['Transition', 'Transition: undefined'], error: 'Transition type is undefined or not a string.' },
                // No specific connection errors as item.type is not 'connection' and targetNodeId/transform are undefined.
            ]);
        });

        it('should return error if type is connection but targetNodeId is not a string', () => {
            const invalidItem1: any = { id: 'conn1', type: 'connection', targetNodeId: 123 };
            expect(validateConnection(invalidItem1)).toEqual([
                { coordinates: ['Connection', 'Connection: conn1'], error: 'Property "targetNodeId" must be a string when type is "connection".' },
            ]);
            const invalidItem2: any = { id: 'conn2', type: 'connection' }; // targetNodeId missing
            expect(validateConnection(invalidItem2)).toEqual([
                { coordinates: ['Connection', 'Connection: conn2'], error: 'Property "targetNodeId" must be a string when type is "connection".' },
            ]);
        });

        it('should return error if type is connection and transform is present but not a function', () => {
            const invalidItem: any = { id: 'conn3', type: 'connection', targetNodeId: 'node1', transform: 'not-a-function' };
            expect(validateConnection(invalidItem)).toEqual([
                { coordinates: ['Connection', 'Connection: conn3'], error: 'Optional property "transform" must be a function if present.' },
            ]);
        });

        it('should return no connection-specific errors if type is not connection (valid or missing optional fields)', () => {
            const item1: any = { id: 'd1', type: 'decision', targetNodeId: 'n1', transform: mockTransformFunction };
            expect(validateConnection(item1)).toEqual([]); // validateTransition passes, type is not 'connection'

            const item2: any = { id: 'd2', type: 'decision' };
            expect(validateConnection(item2)).toEqual([]);
        });

        it('should return errors if type is not connection but connection-specific fields are present and invalid', () => {
            const item1: any = { id: 'd3', type: 'decision', targetNodeId: 123 };
            expect(validateConnection(item1)).toEqual([
                { coordinates: ['Connection', 'Connection: d3'], error: 'Property "targetNodeId" is present but is not a string.' }
            ]);

            const item2: any = { id: 'd4', type: 'decision', transform: 'not-a-function' };
            expect(validateConnection(item2)).toEqual([
                { coordinates: ['Connection', 'Connection: d4'], error: 'Property "transform" is present but is not a function.' }
            ]);

            const item3: any = { id: 'd5', type: 'decision', targetNodeId: 456, transform: 'not-func' };
            expect(validateConnection(item3)).toEqual([
                { coordinates: ['Connection', 'Connection: d5'], error: 'Property "targetNodeId" is present but is not a string.' },
                { coordinates: ['Connection', 'Connection: d5'], error: 'Property "transform" is present but is not a function.' }
            ]);
        });

        it('should correctly use coordinates when provided', () => {
            const errorsForEmptyObj = validateConnection({}, ['Root']);
            expect(errorsForEmptyObj.length).toBe(4);
            expect(errorsForEmptyObj[0].coordinates.slice(0, 2)).toEqual(['Root', 'Transition']);

            const item = { id: 'c6', type: 'connection', targetNodeId: 789 };
            const errorsForInvalidConn = validateConnection(item, ['Root']);
            expect(errorsForInvalidConn.length).toBe(1);
            expect(errorsForInvalidConn[0].coordinates).toEqual(['Root', 'Connection', 'Connection: c6']);
            expect(errorsForInvalidConn[0].error).toBe('Property "targetNodeId" must be a string when type is "connection".');
        });
    });
}); 