import { PhaseNode } from '../../src/node/phasenode';
import { createPhase, Phase } from '../../src/phase';
import { isPhaseNode } from '../../src/node/phasenode';
import { isConnection, Connection } from '../../src/transition/connection';
import { createTermination, isTermination, Termination } from '../../src/transition/termination';
import { isDecision, Decision, createDecision } from '../../src/transition/decision';
import { Input } from '../../src/input';
import { Output } from '../../src/output';
import { Context } from '../../src/context';
import { jest } from '@jest/globals';
import { Next } from 'transition/next';

interface MockInput extends Input { data: string; }
interface MockOutput extends Output { result: string; }
interface MockContext extends Context { userId: string; }

describe('PhaseNode', () => {
    const mockPhase: Phase<MockInput, MockOutput> = createPhase('phase1', { execute: async (input) => ({ result: input.data + ' processed' }) });

    const mockConnection: Connection<MockOutput, MockContext> = {
        id: 'conn1',
        type: 'connection',
        targetNodeId: 'nextNodeId',
        // @ts-ignore
        transform: jest.fn().mockImplementation((output: MockOutput, context: MockContext) => [{ data: output.result }, context]),
    };

    const mockTermination: Termination<MockOutput, MockContext> = createTermination('term1', { terminate: async (output, context) => ({ result: output.result + ' terminated' }) });

    const mockDecision: Decision<MockOutput, MockContext> = createDecision('decision1', async (output, context) => {
        if (output.result === 'proceed') {
            return [mockConnection];
        }
        return mockTermination;
    });

    describe('isPhaseNode', () => {
        it('should return true for a valid PhaseNode object', () => {
            const validNode: PhaseNode<MockInput, MockOutput> = {
                id: 'node1',
                type: 'phase',
                phase: mockPhase,
            };
            expect(isPhaseNode(validNode)).toBe(true);
        });

        it('should return true for a valid PhaseNode with next as Termination', () => {
            const validNode: PhaseNode<MockInput, MockOutput> = {
                id: 'node1',
                type: 'phase',
                phase: mockPhase,
                next: mockTermination as any,
            };
            expect(isPhaseNode(validNode)).toBe(true);
        });

        it('should return true for a valid PhaseNode with next as an array of Connections', () => {
            const validNode: PhaseNode<MockInput, MockOutput> = {
                id: 'node1',
                type: 'phase',
                phase: mockPhase,
                next: [mockConnection, mockConnection] as any,
            };
            expect(isPhaseNode(validNode)).toBe(true);
        });

        it('should return true for a valid PhaseNode with next as an array of Decisions', () => {
            const validNode: PhaseNode<MockInput, MockOutput> = {
                id: 'node1',
                type: 'phase',
                phase: mockPhase,
                next: [mockDecision, mockDecision] as any,
            };
            expect(isPhaseNode(validNode)).toBe(true);
        });

        it('should return true for a valid PhaseNode with next as an empty array', () => {
            const validNode: PhaseNode<MockInput, MockOutput> = {
                id: 'node1',
                type: 'phase',
                phase: mockPhase,
            };
            expect(isPhaseNode(validNode)).toBe(true);
        });

        it('should return false if id is missing', () => {
            const invalidNode: any = {
                phase: mockPhase,
                next: [],
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false if phase is missing', () => {
            const invalidNode: any = {
                id: 'node1',
                next: [],
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false if phase is not a valid Phase object', () => {
            const invalidNode: any = {
                id: 'node1',
                phase: { έργο: 'not a phase' },
                next: [],
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false if next is missing', () => {
            const invalidNode: any = {
                id: 'node1',
                phase: mockPhase,
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false if next is an object but not Termination or Array', () => {
            const invalidNode: any = {
                id: 'node1',
                phase: mockPhase,
                next: { id: 123, someOtherProp: 'value' },
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false if next is an array of mixed valid and invalid types', () => {
            const invalidNode: any = {
                id: 'node1',
                phase: mockPhase,
                next: [mockConnection, { notAConnection: true }],
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false if next is an array of mixed Connections and Decisions (not allowed by current type, but guard should be robust)', () => {
            const invalidNode: any = {
                id: 'node1',
                phase: mockPhase,
                next: [mockConnection, mockDecision],
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false if next is an array with non-object elements', () => {
            const invalidNode: any = {
                id: 'node1',
                phase: mockPhase,
                next: [mockConnection, 'not-an-object'],
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false if next is an array with null elements', () => {
            const invalidNode: any = {
                id: 'node1',
                phase: mockPhase,
                next: [mockConnection, null],
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false for null', () => {
            expect(isPhaseNode(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isPhaseNode(undefined)).toBe(false);
        });

        it('should return false for a primitive type', () => {
            expect(isPhaseNode('not a node')).toBe(false);
        });

        it('should return false if next is a primitive type (e.g. string) and not an object', () => {
            const invalidNode: any = {
                id: 'node1',
                phase: mockPhase,
                next: 'this-is-a-string',
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false if next is an array and its first element is null', () => {
            const invalidNode: any = {
                id: 'node1',
                phase: mockPhase,
                next: [null, mockConnection],
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });

        it('should return false if next is an array and its first element is a non-object primitive', () => {
            const invalidNode: any = {
                id: 'node1',
                phase: mockPhase,
                next: ['not-an-object', mockConnection],
            };
            expect(isPhaseNode(invalidNode)).toBe(false);
        });
    });

    // NEW: Tests for isConnection
    describe('isConnection', () => {
        it('should return true for a valid Connection object', () => {
            expect(isConnection(mockConnection)).toBe(true);
        });

        it('should return false if targetNodeId is missing', () => {
            const invalidConnection: any = { ...mockConnection };
            delete invalidConnection.targetNodeId;
            expect(isConnection(invalidConnection)).toBe(false);
        });

        it('should return false for null', () => {
            expect(isConnection(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isConnection(undefined)).toBe(false);
        });

        it('should return false for a primitive type', () => {
            expect(isConnection('not a connection')).toBe(false);
        });

        it('should return false for an empty object', () => {
            expect(isConnection({})).toBe(false);
        });
    });

    // NEW: Tests for isTermination
    describe('isTermination', () => {
        it('should return true for a valid Termination object', () => {
            expect(isTermination(mockTermination)).toBe(true);
        });

        it('should return false if id is missing', () => {
            const invalidTermination: any = { ...mockTermination };
            delete invalidTermination.id;
            expect(isTermination(invalidTermination)).toBe(false);
        });

        it('should return false if id is not a string', () => {
            const invalidTermination: any = { ...mockTermination, id: 123 };
            expect(isTermination(invalidTermination)).toBe(false);
        });

        it('should return false for null', () => {
            expect(isTermination(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isTermination(undefined)).toBe(false);
        });

        it('should return false for a primitive type', () => {
            expect(isTermination('not a termination')).toBe(false);
        });

        it('should return false for an empty object', () => {
            expect(isTermination({})).toBe(false);
        });
    });

    // NEW: Tests for isDecision
    describe('isDecision', () => {
        it('should return true for a valid Decision object', () => {
            expect(isDecision(mockDecision)).toBe(true);
        });

        it('should return false if id is missing', () => {
            const invalidDecision: any = { ...mockDecision };
            delete invalidDecision.id;
            expect(isDecision(invalidDecision)).toBe(false);
        });

        it('should return false if id is not a string', () => {
            const invalidDecision: any = { ...mockDecision, id: 123 };
            expect(isDecision(invalidDecision)).toBe(false);
        });

        it('should return false if decide function is missing', () => {
            const invalidDecision: any = { ...mockDecision };
            delete invalidDecision.decide;
            expect(isDecision(invalidDecision)).toBe(false);
        });

        it('should return false if decide is not a function', () => {
            const invalidDecision: any = { ...mockDecision, decide: 'not a function' };
            expect(isDecision(invalidDecision)).toBe(false);
        });

        it('should return false for null', () => {
            expect(isDecision(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isDecision(undefined)).toBe(false);
        });

        it('should return false for a primitive type', () => {
            expect(isDecision('not a decision')).toBe(false);
        });

        it('should return false for an empty object', () => {
            expect(isDecision({})).toBe(false);
        });
    });
});
