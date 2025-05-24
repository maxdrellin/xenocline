import { jest } from '@jest/globals';
import { PhaseNode, validatePhaseNode } from '../../src/node/phasenode';
import { Phase } from '../../src/phase';
import { createTermination, Termination } from '../../src/transition/termination';
import { Output } from '../../src/output';
import { Context } from '../../src/context';
import { Input } from '../../src/input';

// Mock implementations
const mockExecute = async (input: Input): Promise<Output> => {
    return { id: 'output1' };
};

const mockTermination: Termination<Output, Context> = createTermination('term1', { terminate: async (output, context) => ({ id: 'terminatedOutput' }) });


const mockPhase: Phase<Input, Output> = {
    name: 'mockPhase',
    execute: mockExecute,
};

describe('validatePhaseNode', () => {
    it('should return no errors for a valid PhaseNode', () => {
        const node: PhaseNode = {
            id: 'node1',
            type: 'phase',
            phase: mockPhase,
            next: mockTermination,
        };

        const errors = validatePhaseNode(node);
        expect(errors).toHaveLength(0);
    });

    it('should return errors when phase is undefined', () => {
        const node = {
            id: 'node1',
            type: 'phase',
            next: mockTermination,
        };

        const errors = validatePhaseNode(node);
        expect(errors).toHaveLength(1);
        expect(errors[0].error).toBe('phase is undefined.');
    });

    it('should return errors when phase validation fails', () => {
        const invalidPhase = {
            name: 'invalidPhase',
            // Missing process function
        };

        const node = {
            id: 'node1',
            type: 'phase',
            phase: invalidPhase,
            next: mockTermination,
        };

        const errors = validatePhaseNode(node);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.error.includes('execute'))).toBe(true);
    });

    it('should include coordinates in error messages', () => {
        const node = {
            id: 'node1',
            type: 'phase',
            // Missing phase
        };

        const errors = validatePhaseNode(node, ['root']);
        expect(errors[0].coordinates).toEqual(['root', 'PhaseNode', 'PhaseNode: node1']);
    });
});
