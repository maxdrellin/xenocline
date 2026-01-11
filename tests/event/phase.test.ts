import { describe,it,expect } from 'vitest';
import { createPhaseEvent, isPhaseEvent, PhaseEvent } from '../../src/event/phase';
import { Phase } from '../../src/xenocline'; // Assuming Phase is a type/interface from Xenocline
import { Event } from '../../src/event/event';

describe('Phase Event Utilities', () => {
    describe('createPhaseEvent', () => {
        const mockPhase = {
            id: 'phase1',
            name: 'Test Phase',
            execute: async () => ({ result: 'mock' })
        } as Phase;
        const sourceId = 'test-source';

        it('should create a PhaseEvent', () => {
            const event = createPhaseEvent(sourceId, 'start', mockPhase);
            expect(event.type).toBe('phase');
            expect(event.phase).toBe(mockPhase);
            expect(event.stage).toBe('start');
            expect(event.sourceId).toBe(sourceId);
            expect(event.date).toBeInstanceOf(Date);
        });
    });

    describe('isPhaseEvent', () => {
        const mockPhase = {
            id: 'phase2',
            name: 'Another Test Phase',
            execute: async () => ({ result: 'mock' })
        } as Phase;
        const validPhaseEventStart: PhaseEvent = createPhaseEvent('source1', 'start', mockPhase);
        const validPhaseEventEnd: PhaseEvent = createPhaseEvent('source2', 'execute', mockPhase);

        it('should return true for a valid PhaseEvent with stage "start"', () => {
            expect(isPhaseEvent(validPhaseEventStart)).toBe(true);
        });

        it('should return true for a valid PhaseEvent with stage "execute"', () => {
            expect(isPhaseEvent(validPhaseEventEnd)).toBe(true);
        });

        it('should return false for an event with a different type', () => {
            const wrongTypeEvent: Event = { type: 'other', sourceId: 'test', date: new Date(), stage: 'anyStage' };
            expect(isPhaseEvent(wrongTypeEvent)).toBe(false);
        });

        it('should return false for a PhaseEvent with an invalid stage', () => {
            const invalidStageEvent: any = {
                type: 'phase',
                phase: mockPhase,
                stage: 'invalid', // Invalid stage
                sourceId: 'test',
                date: new Date(),
            };
            expect(isPhaseEvent(invalidStageEvent)).toBe(false);
        });

        it('should return false if "phase" property is missing', () => {
            const missingPhaseEvent: any = {
                type: 'phase',
                stage: 'start',
                sourceId: 'test',
                date: new Date(),
            };
            expect(isPhaseEvent(missingPhaseEvent)).toBe(false);
        });

        it('should return false for a generic event that is not a PhaseEvent', () => {
            const genericEvent: Event = {
                type: 'custom',
                sourceId: 'generic-source',
                date: new Date(),
                stage: 'anotherStage',
            };
            expect(isPhaseEvent(genericEvent)).toBe(false);
        });
    });
});
