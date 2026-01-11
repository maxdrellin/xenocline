import { describe,it,expect } from 'vitest';
import { Event, EventType } from '../../src/event/event';

describe('Event', () => {
    it('should create an event with correct properties', () => {
        const now = new Date();
        const eventData: Event = {
            date: now,
            type: 'process',
            stage: 'test-stage',
            sourceId: 'test-source-id',
        };

        expect(eventData.date).toBe(now);
        expect(eventData.type).toBe('process');
        expect(eventData.stage).toBe('test-stage');
        expect(eventData.sourceId).toBe('test-source-id');
    });

    it('should allow valid event types', () => {
        const eventTypeProcess: EventType = 'process';
        const eventTypePhase: EventType = 'phase';
        const eventTypeTransition: EventType = 'transition';
        const eventTypeExecution: EventType = 'execution';
        const eventTypeAggregator: EventType = 'aggregator';

        expect(eventTypeProcess).toBe('process');
        expect(eventTypePhase).toBe('phase');
        expect(eventTypeTransition).toBe('transition');
        expect(eventTypeExecution).toBe('execution');
        expect(eventTypeAggregator).toBe('aggregator');

        // This test primarily relies on TypeScript's static type checking.
        // A runtime check for EventType might involve a validation function
        // if these types were coming from an external source without type safety.
    });
});
