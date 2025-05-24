import { createProcessEvent, isProcessEvent, ProcessEvent } from '../../src/event/process';
import { type Process, type PhaseNode, type AggregatorNode, type Phase, createProcess } from '../../src/xenocline';

// Mock Context type for testing purposes
interface MockContext {
    userId?: string;
    traceId?: string;
}

// Minimal mock phase for testing, assuming 'phase' type
const mockPhaseNode: PhaseNode<any, any> = {
    type: 'phase',
    id: 'phase1',
    phase: {
        id: 'phase1',
        name: 'Test Phase',
        execute: async () => ({ result: 'mock' })
    } as Phase,
};

describe('Process Event', () => {
    const mockProcess: Process = createProcess(
        'Test Process',
        {
            phases: { initialPhase: mockPhaseNode },
        }
    );

    const sourceId = 'test-source';

    describe('createProcessEvent', () => {
        it('should create a process event with the correct properties for "start" stage', () => {
            const event = createProcessEvent(sourceId, 'start', mockProcess);
            expect(event.sourceId).toBe(sourceId);
            expect(event.type).toBe('process');
            expect(event.process).toBe(mockProcess);
            expect(event.stage).toBe('start');
            expect(event.date).toBeInstanceOf(Date);
        });

        it('should create a process event with the correct properties for "start" stage', () => {
            const event = createProcessEvent(sourceId, 'start', mockProcess);
            expect(event.stage).toBe('start');
        });

        it('should create a process event with the correct properties for "end" stage', () => {
            const event = createProcessEvent(sourceId, 'end', mockProcess);
            expect(event.stage).toBe('end');
        });

        it('should return a readonly event object', () => {
            const event = createProcessEvent(sourceId, 'start', mockProcess);
            expect(typeof event).toBe('object');
        });
    });

    describe('isProcessEvent', () => {
        it('should return true for a valid process event', () => {
            const event = createProcessEvent(sourceId, 'start', mockProcess);
            expect(isProcessEvent(event)).toBe(true);
        });

        it('should return false if type is not "process"', () => {
            const event: any = {
                sourceId,
                type: 'not-process',
                process: mockProcess,
                stage: 'start',
                date: new Date(),
            };
            expect(isProcessEvent(event)).toBe(false);
        });

        it('should return false if process is missing', () => {
            const event: any = {
                sourceId,
                type: 'process',
                stage: 'start',
                date: new Date(),
            };
            expect(isProcessEvent(event)).toBe(false);
        });

        it('should return false if stage is missing', () => {
            const event: any = {
                sourceId,
                type: 'process',
                process: mockProcess,
                date: new Date(),
            };
            expect(isProcessEvent(event)).toBe(false);
        });

        it('should return false for an object with a different structure', () => {
            const notAnEvent = { a: 1, b: 2 };
            expect(isProcessEvent(notAnEvent)).toBe(false);
        });

        it('should return false for null', () => {
            expect(isProcessEvent(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isProcessEvent(undefined)).toBe(false);
        });

        it('should return false for a string', () => {
            expect(isProcessEvent('i am a process event')).toBe(false);
        });

        it('should return false for a number', () => {
            expect(isProcessEvent(123)).toBe(false);
        });
    });
});
