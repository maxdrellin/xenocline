import { isOutput, validateOutput, EMPTY_OUTPUT } from '../src/output';

describe('Output Tests', () => {
    describe('isOutput', () => {
        it('should return true for a valid output object', () => {
            expect(isOutput({})).toBe(true);
            expect(isOutput({ key: 'value' })).toBe(true);
            expect(isOutput(EMPTY_OUTPUT)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isOutput(null)).toBe(false);
        });

        it('should return false for arrays', () => {
            expect(isOutput([])).toBe(false);
            expect(isOutput([1, 2, 3])).toBe(false);
        });

        it('should return false for primitives', () => {
            expect(isOutput(123)).toBe(false);
            expect(isOutput('string')).toBe(false);
            expect(isOutput(true)).toBe(false);
            expect(isOutput(undefined)).toBe(false);
        });
    });

    describe('validateOutput', () => {
        it('should return true for a valid output object', () => {
            expect(validateOutput({})).toBe(true);
            expect(validateOutput({ key: 'value' })).toBe(true);
            expect(validateOutput(EMPTY_OUTPUT)).toBe(true);
        });

        it('should throw an error for null', () => {
            expect(() => validateOutput(null)).toThrow('Output must be an object');
        });

        it('should throw an error for arrays', () => {
            expect(() => validateOutput([])).toThrow('Output must be an object');
        });

        it('should throw an error for primitives', () => {
            expect(() => validateOutput(123)).toThrow('Output must be an object');
            expect(() => validateOutput('string')).toThrow('Output must be an object');
            expect(() => validateOutput(true)).toThrow('Output must be an object');
            expect(() => validateOutput(undefined)).toThrow('Output must be an object');
        });
    });
});
