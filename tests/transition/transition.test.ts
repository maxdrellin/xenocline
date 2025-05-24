import { createTransition, isTransition, validateTransition, Transition } from '../../src/transition/transition';

describe('Transition', () => {
    describe('createTransition', () => {
        it('should create a transition object with the given type and id', () => {
            const transition = createTransition('connection', 'testId');
            expect(transition.id).toBe('testId');
            expect(transition.type).toBe('connection');
        });
    });

    describe('isTransition', () => {
        it('should return true for a valid transition object', () => {
            const transition = { id: 'testId', type: 'decision' };
            expect(isTransition(transition)).toBe(true);
        });

        it('should return false for an invalid transition object', () => {
            expect(isTransition(null)).toBe(false);
            expect(isTransition({})).toBe(false);
            expect(isTransition({ id: 'testId' })).toBe(false);
            expect(isTransition({ type: 'termination' })).toBe(false);
            expect(isTransition({ id: 123, type: 'connection' })).toBe(false);
            expect(isTransition({ id: 'testId', type: 'invalid' })).toBe(false);
        });
    });

    describe('validateTransition', () => {
        it('should return an empty array for a valid transition object', () => {
            const transition: Transition = { id: 'testId', type: 'connection' };
            expect(validateTransition(transition)).toEqual([]);
        });

        it('should return an array of errors for an invalid transition object', () => {
            expect(validateTransition(null)).toEqual([{ coordinates: ['Transition'], error: 'Transition is undefined or null.' }]);
            expect(validateTransition(undefined)).toEqual([{ coordinates: ['Transition'], error: 'Transition is undefined or null.' }]);
            expect(validateTransition({})).toEqual([
                { coordinates: ['Transition'], error: 'Transition id is undefined or not a string.' },
                { coordinates: ['Transition'], error: 'Transition type is undefined or not a string.' },
                { coordinates: ['Transition'], error: 'Transition type is not a valid type.' },
                { coordinates: ['Transition', 'Transition: undefined'], error: 'Transition type is undefined or not a string.' }
            ]);
            const invalidTransition1 = { id: 123, type: 'invalid' };
            expect(validateTransition(invalidTransition1)).toEqual([
                { coordinates: ['Transition'], error: 'Transition id is undefined or not a string.' },
                { coordinates: ['Transition'], error: 'Transition type is not a valid type.' },
            ]);
            const invalidTransition2 = { id: "id1", type: 'invalid' };
            expect(validateTransition(invalidTransition2)).toEqual([
                { coordinates: ['Transition'], error: 'Transition type is not a valid type.' },
            ]);
            const invalidTransition3 = { id: 123, type: 'connection' };
            expect(validateTransition(invalidTransition3)).toEqual([
                { coordinates: ['Transition'], error: 'Transition id is undefined or not a string.' },
            ]);
        });

        it('should correctly use coordinates when provided', () => {
            const errors = validateTransition({}, ['Root']);
            expect(errors[0].coordinates[0]).toBe('Root');
        });
    });
});
