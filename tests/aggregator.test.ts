import { describe, it, expect } from 'vitest';
import { Aggregator, isAggregator, AggregationResult, validateAggregator } from '../src/aggregator';
import { Input } from '../src/input';
import { Output } from '../src/output';
import { Context } from '../src/context';

describe('isAggregator', () => {

    const validAggregator: Aggregator<Output, Context> = {
        name: 'TestAggregator',
        aggregate: async (input: Input, context: Context): Promise<AggregationResult<Output>> => {
            return { status: 'Ready', output: { data: 'test output' } };
        },
    };

    it('should return true for a valid aggregator object', () => {
        expect(isAggregator(validAggregator)).toBe(true);
    });

    it('should return false for null', () => {
        expect(isAggregator(null)).toBe(false);
    });

    it('should return false for undefined', () => {
        expect(isAggregator(undefined)).toBe(false);
    });

    it('should return false for a non-object type (e.g., string)', () => {
        expect(isAggregator('not an aggregator')).toBe(false);
    });

    it('should return false for an object missing the name property', () => {
        const missingName = { ...validAggregator };
        delete (missingName as any).name;
        expect(isAggregator(missingName)).toBe(false);
    });

    it('should return false for an object with name property of wrong type', () => {
        const wrongTypeName = { ...validAggregator, name: 123 };
        expect(isAggregator(wrongTypeName)).toBe(false);
    });

    it('should return false for an object missing the aggregate property', () => {
        const missingAggregate = { ...validAggregator };
        delete (missingAggregate as any).aggregate;
        expect(isAggregator(missingAggregate)).toBe(false);
    });

    it('should return false for an object with aggregate property of wrong type', () => {
        const wrongTypeAggregate = { ...validAggregator, aggregate: 'not a function' };
        expect(isAggregator(wrongTypeAggregate)).toBe(false);
    });

    it('should return true for an aggregator with a different Output type (if structure matches)', () => {
        interface AnotherOutput extends Output {
            specificField: string;
        }
        const anotherAggregator: Aggregator<AnotherOutput> = {
            name: 'AnotherAggregator',
            aggregate: async (input: Input, context: Context): Promise<AggregationResult<AnotherOutput>> => {
                return { status: 'Ready', output: { specificField: 'value' } as AnotherOutput };
            },
        };
        expect(isAggregator<AnotherOutput>(anotherAggregator)).toBe(true);
    });
});

describe('validateAggregator', () => {
    const validAggregator: Aggregator<Output, Context> = {
        name: 'TestAggregator',
        aggregate: async (input: Input, context: Context): Promise<AggregationResult<Output>> => {
            return { status: 'Ready', output: { data: 'test output' } };
        },
    };

    it('should return an empty array for a valid aggregator', () => {
        expect(validateAggregator(validAggregator)).toEqual([]);
    });

    it('should return an error if the aggregator is undefined', () => {
        const errors = validateAggregator(undefined);
        expect(errors.length).toBe(1);
        expect(errors[0].error).toBe('Aggregator is undefined or null.');
        expect(errors[0].coordinates).toEqual(['Aggregator']);
    });

    it('should return an error if the aggregator is null', () => {
        const errors = validateAggregator(null);
        expect(errors.length).toBe(1);
        expect(errors[0].error).toBe('Aggregator is undefined or null.');
        expect(errors[0].coordinates).toEqual(['Aggregator']);
    });

    it('should return an error if name is undefined', () => {
        const invalidAggregator = { ...validAggregator };
        delete (invalidAggregator as any).name;
        const errors = validateAggregator(invalidAggregator);
        expect(errors.length).toBe(1);
        expect(errors[0].error).toBe('Aggregator name is undefined or not a string.');
        expect(errors[0].coordinates).toEqual(['Aggregator']);
    });

    it('should return an error if name is not a string', () => {
        const invalidAggregator = { ...validAggregator, name: 123 };
        const errors = validateAggregator(invalidAggregator);
        expect(errors.length).toBe(1);
        expect(errors[0].error).toBe('Aggregator name is undefined or not a string.');
        expect(errors[0].coordinates).toEqual(['Aggregator']);
    });

    it('should return an error if aggregate is undefined', () => {
        const invalidAggregator = { ...validAggregator };
        delete (invalidAggregator as any).aggregate;
        const errors = validateAggregator(invalidAggregator);
        // This will also produce an error for the coordinates, as item.name will be undefined in the push
        expect(errors.length).toBe(1);
        expect(errors[0].error).toBe('Aggregator aggregate is undefined or not a function.');
        // The coordinates will be ['Aggregator', 'Aggregator: TestAggregator'] because name is valid
        expect(errors[0].coordinates).toEqual(['Aggregator', 'Aggregator: TestAggregator']);
    });

    it('should return an error if aggregate is not a function', () => {
        const invalidAggregator = { ...validAggregator, aggregate: 'not a function' };
        const errors = validateAggregator(invalidAggregator);
        expect(errors.length).toBe(1);
        expect(errors[0].error).toBe('Aggregator aggregate is undefined or not a function.');
        expect(errors[0].coordinates).toEqual(['Aggregator', 'Aggregator: TestAggregator']);
    });

    it('should correctly report coordinates when name is invalid and aggregate is invalid', () => {
        const invalidAggregator = { name: 123, aggregate: 'not a function' };
        const errors = validateAggregator(invalidAggregator);
        expect(errors.length).toBe(2);
        // Order of errors might vary depending on implementation details not visible here (e.g. object key order)
        // So, check for the presence of both errors without assuming order.
        expect(errors).toContainEqual({
            coordinates: ['Aggregator'],
            error: 'Aggregator name is undefined or not a string.',
        });
        expect(errors).toContainEqual({
            // The coordinate here will use the invalid name in its path.
            coordinates: ['Aggregator', 'Aggregator: 123'],
            error: 'Aggregator aggregate is undefined or not a function.',
        });
    });

    it('should pass validation with coordinates', () => {
        const errors = validateAggregator(validAggregator, ['Root', 'Process1']);
        expect(errors).toEqual([]);
    });

    it('should return an error with correct coordinates path when aggregator is undefined', () => {
        const errors = validateAggregator(undefined, ['Root', 'Process1']);
        expect(errors.length).toBe(1);
        expect(errors[0].error).toBe('Aggregator is undefined or null.');
        expect(errors[0].coordinates).toEqual(['Root', 'Process1', 'Aggregator']);
    });


    it('should return an error with correct coordinates path when name is undefined', () => {
        const invalidAggregator = { ...validAggregator };
        delete (invalidAggregator as any).name;
        const errors = validateAggregator(invalidAggregator, ['Root', 'Process1']);
        expect(errors.length).toBe(1);
        expect(errors[0].error).toBe('Aggregator name is undefined or not a string.');
        expect(errors[0].coordinates).toEqual(['Root', 'Process1', 'Aggregator']);
    });

    it('should return an error with correct coordinates path when aggregate is not a function', () => {
        const invalidAggregator = { ...validAggregator, aggregate: 'not a function' };
        const errors = validateAggregator(invalidAggregator, ['Root', 'Process1']);
        expect(errors.length).toBe(1);
        expect(errors[0].error).toBe('Aggregator aggregate is undefined or not a function.');
        expect(errors[0].coordinates).toEqual(['Root', 'Process1', 'Aggregator', 'Aggregator: TestAggregator']);
    });
});
