import { describe,it,expect } from 'vitest';
import { Input } from '../src/input';
import { Output } from '../src/output';
import { isPhase, Phase, validatePhase, createPhase } from '../src/phase';


describe('Phase', () => {
    describe('isPhase', () => {
        const mockExecute = async (input: Input): Promise<Output> => { return {}; };

        it('should return true for a valid phase instance', () => {
            const validInstance: Phase = {
                name: 'testPhase',
                execute: mockExecute,
            };
            expect(isPhase(validInstance)).toBe(true);
        });

        it('should return false if name is missing', () => {
            const invalidInstance = {
                execute: mockExecute,
            };
            expect(isPhase(invalidInstance)).toBe(false);
        });

        it('should return false if execute is missing', () => {
            const invalidInstance = {
                name: 'testPhase',
            };
            expect(isPhase(invalidInstance)).toBe(false);
        });

        it('should return false if name is not a string', () => {
            const invalidInstance = {
                name: 123,
                execute: mockExecute,
            };
            expect(isPhase(invalidInstance)).toBe(false);
        });

        it('should return false if execute is not a function', () => {
            const invalidInstance = {
                name: 'testPhase',
                execute: 'notAFunction',
            };
            expect(isPhase(invalidInstance)).toBe(false);
        });

        it('should return false for null', () => {
            expect(isPhase(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isPhase(undefined)).toBe(false);
        });

        it('should return false for a non-object type (e.g., string)', () => {
            expect(isPhase('notAnObject')).toBe(false);
        });

        it('should return false for an empty object', () => {
            expect(isPhase({})).toBe(false);
        });
    });

    describe('validatePhase', () => {
        const mockExecute = async (input: Input): Promise<Output> => { return {}; };

        it('should return an empty array for a valid phase', () => {
            const phase = { name: 'test', execute: mockExecute };
            expect(validatePhase(phase)).toEqual([]);
        });

        it('should return an error if phase is undefined', () => {
            const errors = validatePhase(undefined);
            expect(errors.length).toBe(1);
            expect(errors[0].error).toBe('Phase is undefined or null.');
            expect(errors[0].coordinates).toEqual(['Phase']);
        });

        it('should return an error if phase is null', () => {
            const errors = validatePhase(null);
            expect(errors.length).toBe(1);
            expect(errors[0].error).toBe('Phase is undefined or null.');
            expect(errors[0].coordinates).toEqual(['Phase']);
        });

        it('should return an error if name is missing', () => {
            const phase = { execute: mockExecute };
            const errors = validatePhase(phase);
            expect(errors.length).toBe(1);
            expect(errors[0].error).toBe('Phase name is undefined or not a string.');
            expect(errors[0].coordinates).toEqual(['Phase']);
        });

        it('should return an error if name is not a string', () => {
            const phase = { name: 123, execute: mockExecute };
            const errors = validatePhase(phase);
            expect(errors.length).toBe(1);
            expect(errors[0].error).toBe('Phase name is undefined or not a string.');
            expect(errors[0].coordinates).toEqual(['Phase']);
        });

        it('should return an error if execute is missing', () => {
            const phase = { name: 'test' };
            const errors = validatePhase(phase);
            expect(errors.length).toBe(1);
            expect(errors[0].error).toBe('Phase execute is undefined or not a function.');
            expect(errors[0].coordinates).toEqual(['Phase', 'Phase: test']);
        });

        it('should return an error if execute is not a function', () => {
            const phase = { name: 'test', execute: 'notAFunction' };
            const errors = validatePhase(phase);
            expect(errors.length).toBe(1);
            expect(errors[0].error).toBe('Phase execute is undefined or not a function.');
            expect(errors[0].coordinates).toEqual(['Phase', 'Phase: test']);
        });

        it('should return multiple errors if multiple fields are invalid', () => {
            const phase = { name: 123, execute: 'notAFunction' };
            const errors = validatePhase(phase);
            expect(errors.length).toBe(2);
            // Order of errors might vary depending on implementation, so check for specific errors
            expect(errors).toContainEqual({ coordinates: ['Phase'], error: 'Phase name is undefined or not a string.' });
            // The second coordinate will use the (invalid) name if it exists
            expect(errors).toContainEqual({ coordinates: ['Phase', 'Phase: 123'], error: 'Phase execute is undefined or not a function.' });
        });

        it('should use provided coordinates', () => {
            const phase = { name: 123, execute: mockExecute };
            const errors = validatePhase(phase, ['Root', 'Process1']);
            expect(errors[0].coordinates).toEqual(['Root', 'Process1', 'Phase']);
        });
    });

    describe('createPhase', () => {
        const mockExecute = async (input: Input): Promise<Output> => { return { result: 'mock' }; };

        it('should create a phase with a name and default execute function', () => {
            const phaseName = 'defaultExecutePhase';
            const phase = createPhase(phaseName, {});
            expect(phase.name).toBe(phaseName);
            expect(typeof phase.execute).toBe('function');
            // Test default execute function behavior (it returns the input)
            const testInput = { data: 'test' };
            return phase.execute(testInput).then(output => {
                expect(output).toEqual(testInput);
            });
        });

        it('should create a phase with a name and provided execute function', () => {
            const phaseName = 'customExecutePhase';
            const phase = createPhase(phaseName, { execute: mockExecute });
            expect(phase.name).toBe(phaseName);
            expect(phase.execute).toBe(mockExecute);
            // Test provided execute function
            return phase.execute({}).then(output => {
                expect(output).toEqual({ result: 'mock' });
            });
        });

        it('should create a phase with only a name (using default execute)', () => {
            const phaseName = 'nameOnlyPhase';
            // Type assertion because options are optional, but createPhase expects it
            const phase = createPhase(phaseName, {} as any);
            expect(phase.name).toBe(phaseName);
            expect(typeof phase.execute).toBe('function');
        });

        // Test with generic types
        interface MyInput extends Input {
            customInput: string;
        }
        interface MyOutput extends Output {
            customOutput: string;
        }
        const mockTypedExecute = async (input: MyInput): Promise<MyOutput> => {
            return { customOutput: `processed ${input.customInput}` };
        };

        it('should create a phase with specific Input and Output types', () => {
            const phaseName = 'typedPhase';
            const phase = createPhase<MyInput, MyOutput>(phaseName, { execute: mockTypedExecute });
            expect(phase.name).toBe(phaseName);
            expect(phase.execute).toBe(mockTypedExecute);
            const testInput: MyInput = { customInput: 'data' };
            return phase.execute(testInput).then(output => {
                expect(output.customOutput).toBe('processed data');
            });
        });
    });
});
