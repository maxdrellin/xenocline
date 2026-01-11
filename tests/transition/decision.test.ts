import { describe,it,expect } from 'vitest';
import { createDecision, isDecision, validateDecision, Decision } from '../../src/transition/decision';
import { Context } from '../../src/context';
import { Output } from '../../src/output';
import { createTermination, Termination } from '../../src/transition/termination';
import { Connection, createConnection } from '../../src/transition/connection';

describe('Decision', () => {
    const mockDecideFunction = async (output: Output, context: Context): Promise<Termination | Connection[]> => {
        if (output.status === 'success') {
            return [createConnection('next', 'node1')];
        }
        return createTermination('term', { terminate: async (output, context) => ({ result: output.result + ' terminated' }) });
    };

    describe('createDecision', () => {
        it('should create a decision object with the given id and decide function', () => {
            const decision = createDecision('testId', mockDecideFunction);
            expect(decision.id).toBe('testId');
            expect(decision.type).toBe('decision');
            expect(decision.decide).toBe(mockDecideFunction);
        });
    });

    describe('isDecision', () => {
        it('should return true for a valid decision object', () => {
            const decision = { id: 'testId', type: 'decision', decide: mockDecideFunction };
            expect(isDecision(decision)).toBe(true);
        });

        it('should return false for an invalid decision object', () => {
            expect(isDecision(null)).toBe(false);
            expect(isDecision({})).toBe(false);
            expect(isDecision({ id: 'testId', type: 'decision' })).toBe(false); // Missing decide
            expect(isDecision({ id: 'testId', type: 'connection', decide: mockDecideFunction })).toBe(false); // Wrong type
            expect(isDecision({ id: 'testId', type: 'decision', decide: 'not a function' })).toBe(false); // decide not a function
        });
    });

    describe('validateDecision', () => {
        it('should return an empty array for a valid decision object', () => {
            const decision: Decision = createDecision('testId', mockDecideFunction);
            expect(validateDecision(decision)).toEqual([]);
        });

        it('should return errors from validateTransition for null or undefined input', () => {
            expect(validateDecision(null)).toEqual([
                { coordinates: ['Transition'], error: 'Transition is undefined or null.' }
            ]);
            expect(validateDecision(undefined)).toEqual([
                { coordinates: ['Transition'], error: 'Transition is undefined or null.' }
            ]);
        });

        it('should return errors from validateTransition for a non-object input', () => {
            expect(validateDecision('not-an-object')).toEqual([
                { coordinates: ['Transition'], error: 'Transition is not an object.' }
            ]);
        });

        it('should return errors from validateTransition for an empty object (no decision specific error)', () => {
            expect(validateDecision({})).toEqual([
                { coordinates: ['Transition'], error: 'Transition id is undefined or not a string.' },
                { coordinates: ['Transition'], error: 'Transition type is undefined or not a string.' },
                { coordinates: ['Transition'], error: 'Transition type is not a valid type.' },
                { coordinates: ['Transition', 'Transition: undefined'], error: 'Transition type is undefined or not a string.' },
                // No specific decision error as item.type is not 'decision' and item.decide is undefined.
            ]);
        });

        it('should return error if type is decision but decide is not a function', () => {
            const invalidItem: any = { id: 'dec1', type: 'decision', decide: 'not-a-function' };
            expect(validateDecision(invalidItem)).toEqual([
                { coordinates: ['Decision', 'Decision: dec1'], error: 'Property "decide" must be a function when type is "decision".' },
            ]);
        });

        it('should return error if type is decision but decide is missing', () => {
            const invalidItem: any = { id: 'dec2', type: 'decision' }; // decide is missing
            expect(validateDecision(invalidItem)).toEqual([
                { coordinates: ['Decision', 'Decision: dec2'], error: 'Property "decide" must be a function when type is "decision".' },
            ]);
        });

        it('should return no errors if type is not decision and decide is valid or missing', () => {
            const item1: any = { id: 'dec3', type: 'connection', decide: mockDecideFunction };
            expect(validateDecision(item1)).toEqual([]); // validateTransition passes, type is not 'decision', decide is ok.

            const item2: any = { id: 'dec4', type: 'connection' }; // decide is missing
            expect(validateDecision(item2)).toEqual([]); // validateTransition passes, type is not 'decision'
        });

        it('should return error if type is not decision but decide is present and invalid', () => {
            const item: any = { id: 'dec5', type: 'connection', decide: 'not-a-function' };
            expect(validateDecision(item)).toEqual([
                { coordinates: ['Decision', 'Decision: dec5'], error: 'Property "decide" is present but is not a function.' }
            ]);
        });

        it('should correctly use coordinates when provided', () => {
            const errorsForEmptyObj = validateDecision({}, ['Root']);
            expect(errorsForEmptyObj.length).toBe(4); // Only transition errors
            expect(errorsForEmptyObj[0].coordinates.slice(0, 2)).toEqual(['Root', 'Transition']);

            const item = { id: 'dec6', type: 'decision', decide: 'not-func' };
            const errorsForInvalidDecision = validateDecision(item, ['Root']);
            expect(errorsForInvalidDecision.length).toBe(1);
            expect(errorsForInvalidDecision[0].coordinates).toEqual(['Root', 'Decision', 'Decision: dec6']);
            expect(errorsForInvalidDecision[0].error).toBe('Property "decide" must be a function when type is "decision".');
        });
    });
}); 