import { isProcess } from '../src/process';
import { Context } from '../src/context';
import { PhaseNode } from '../src/node/phasenode';
import { Process } from '../src/process';

describe('isProcess', () => {
    const validContext: Context = {};
    const validPhases: Record<string, PhaseNode> = {
        phase1: { id: 'phase1', type: 'phase', phase: { name: 'TestPhase', execute: async (input: {}) => ({ output: input }) } },
    };

    const validProcess: Process = {
        name: 'Test Process',
        phases: validPhases,
    };

    it('should return true for a valid process object', () => {
        expect(isProcess(validProcess)).toBe(true);
    });

    it('should return false if name is missing', () => {
        const invalidProcess = { ...validProcess, name: undefined };
        expect(isProcess(invalidProcess)).toBe(false);
    });

    it('should return false if name is not a string', () => {
        const invalidProcess = { ...validProcess, name: 123 };
        expect(isProcess(invalidProcess)).toBe(false);
    });

    it('should return false if phases is missing', () => {
        const invalidProcess = { ...validProcess, phases: undefined };
        expect(isProcess(invalidProcess)).toBe(false);
    });

    it('should return false if phases is not an object', () => {
        const invalidProcess = { ...validProcess, phases: 'not an object' };
        expect(isProcess(invalidProcess)).toBe(false);
    });

    it('should return false for null input', () => {
        expect(isProcess(null)).toBe(false);
    });

    it('should return false for undefined input', () => {
        expect(isProcess(undefined)).toBe(false);
    });

    it('should return false for a string input', () => {
        expect(isProcess('this is a string')).toBe(false);
    });

    it('should return false for a number input', () => {
        expect(isProcess(12345)).toBe(false);
    });

    it('should return false for an empty object', () => {
        expect(isProcess({})).toBe(false);
    });
});
