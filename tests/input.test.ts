import { isInput, validateInput, EMPTY_INPUT } from '../src/input';

describe('Input Tests', () => {
    describe('isInput', () => {
        it('should return true for a valid input object', () => {
            expect(isInput({})).toBe(true);
            expect(isInput({ key: 'value' })).toBe(true);
            expect(isInput(EMPTY_INPUT)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isInput(null)).toBe(false);
        });

        it('should return false for arrays', () => {
            expect(isInput([])).toBe(false);
            expect(isInput([1, 2, 3])).toBe(false);
        });

        it('should return false for primitives', () => {
            expect(isInput(123)).toBe(false);
            expect(isInput('string')).toBe(false);
            expect(isInput(true)).toBe(false);
            expect(isInput(undefined)).toBe(false);
        });
    });

    describe('validateInput', () => {
        it('should return true for a valid input object', () => {
            expect(validateInput({})).toBe(true);
            expect(validateInput({ key: 'value' })).toBe(true);
            expect(validateInput(EMPTY_INPUT)).toBe(true);
        });

        it('should throw an error for null', () => {
            expect(() => validateInput(null)).toThrow('Input must be an object');
        });

        it('should throw an error for arrays', () => {
            expect(() => validateInput([])).toThrow('Input must be an object');
        });

        it('should throw an error for primitives', () => {
            expect(() => validateInput(123)).toThrow('Input must be an object');
            expect(() => validateInput('string')).toThrow('Input must be an object');
            expect(() => validateInput(true)).toThrow('Input must be an object');
            expect(() => validateInput(undefined)).toThrow('Input must be an object');
        });
    });
});
