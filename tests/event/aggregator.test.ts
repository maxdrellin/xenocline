import { describe,it,expect } from 'vitest';
import { createAggregatorEvent, isAggregatorEvent, AggregatorEvent, AggregatorEventStage } from '../../src/event/aggregator';
import { Event } from '../../src/event/event';
import { Aggregator, AggregationResult, Input, Output, Context } from '../../src/xenocline';

// Minimal mock types for testing
interface MockInput extends Input { data?: any; }
interface MockOutput extends Output { result?: any; }
interface MockContext extends Context { userId?: string; }

// Mock Aggregator for testing
class MockAggregator implements Aggregator<MockOutput, MockContext> {
    constructor(public id: string, public name: string) { }

    async aggregate(input: MockInput, context: MockContext): Promise<Readonly<AggregationResult<MockOutput>>> {
        // Simple mock aggregation logic
        if (input.data && context.userId) {
            return { status: 'Ready', output: { result: `aggregated-${input.data}-by-${context.userId}-${this.id}` } };
        }
        return { status: 'NotYetReady' };
    }

    // Implement other Aggregator methods if needed for more complex tests
    // For the current tests, reset, getBuckets, getPeriod are not strictly needed by the Aggregator interface shown in search
    // If Aggregator interface has them, they should be added.
    // reset() { /* no op */ }
    // getBuckets() { return []; }
    // getPeriod() { return 0; }
}

describe('Aggregator Event', () => {
    const testSourceId = 'test-source';
    const testAggregatorName = 'TestAggregator';
    const mockAggregatorInstance = new MockAggregator('aggregator-1', testAggregatorName);
    // Removed mockContextInstance and mockInputInstance as they are not directly used in these event tests
    // const mockContextInstance: MockContext = { userId: 'user-123' };
    // const mockInputInstance: MockInput = { data: 'sample-data' };

    describe('createAggregatorEvent', () => {
        it('should create a start aggregator event with correct properties', () => {
            const stage: AggregatorEventStage = 'start';
            const event = createAggregatorEvent(testSourceId, stage, mockAggregatorInstance);

            expect(event.type).toBe('aggregator');
            expect(event.aggregator.name).toBe(testAggregatorName);
            expect(event.stage).toBe(stage);
            expect(event.sourceId).toBe(testSourceId);
            expect(event.aggregator).toBe(mockAggregatorInstance);
            expect(event.date).toBeInstanceOf(Date);
        });

        it('should create a ready aggregator event with correct properties', () => {
            const stage: AggregatorEventStage = 'ready'; // Changed 'end' to 'ready'
            const event = createAggregatorEvent(testSourceId, stage, mockAggregatorInstance);

            expect(event.type).toBe('aggregator');
            expect(event.aggregator.name).toBe(testAggregatorName);
            expect(event.stage).toBe(stage);
            expect(event.sourceId).toBe(testSourceId);
            expect(event.aggregator).toBe(mockAggregatorInstance);
            expect(event.date).toBeInstanceOf(Date);
        });
    });

    describe('isAggregatorEvent', () => {
        it('should return true for a valid aggregator event (as per AggregatorEvent interface)', () => {
            const event: AggregatorEvent = { // Removed 'name' property to align with AggregatorEvent interface
                type: 'aggregator',
                stage: 'start',
                sourceId: testSourceId,
                aggregator: mockAggregatorInstance,
                date: new Date(),
            };
            // This assertion might fail if isAggregatorEvent strictly requires a 'name' property on the event root,
            // which AggregatorEvent interface does not define. This highlights a potential mismatch in src/event/aggregator.ts.
            expect(isAggregatorEvent(event)).toBe(true);
        });

        it('should return false for an event of a different type', () => {
            const event: Event = {
                type: 'other',
                sourceId: testSourceId,
                date: new Date(),
                stage: 'start', // Added stage as base Event type seems to require it
            };
            expect(isAggregatorEvent(event)).toBe(false);
        });

        it('should return false for an aggregator event missing stage property', () => {
            const event: any = { // Using 'any' to simulate missing property
                type: 'aggregator',
                // name: testAggregatorName, // name is not on the root, and isAggregatorEvent checks for it
                sourceId: testSourceId,
                aggregator: mockAggregatorInstance, // Added aggregator
                date: new Date(),
            };
            expect(isAggregatorEvent(event)).toBe(false);
        });

        it('should return false for an aggregator event with an invalid stage', () => {
            const event: any = { // Using 'any' to simulate invalid stage
                type: 'aggregator',
                // name: testAggregatorName, // name is not on the root
                stage: 'invalid-stage',
                sourceId: testSourceId,
                aggregator: mockAggregatorInstance, // Added aggregator
                date: new Date(),
            };
            expect(isAggregatorEvent(event)).toBe(false);
        });

        it('should correctly identify an AggregatorEvent with a specific Aggregator type', () => {
            const typedEvent = createAggregatorEvent(testSourceId, 'start', mockAggregatorInstance);
            if (isAggregatorEvent<MockAggregator>(typedEvent)) {
                // This block should be executed, and TypeScript should infer the type of typedEvent.aggregator
                expect(typedEvent.aggregator.id).toBe('aggregator-1');
                expect(isAggregatorEvent(typedEvent)).toBe(true); // Redundant but good for clarity
            } else {
                throw new Error('isAggregatorEvent should have returned true for a typed event');
            }
        });
    });
});
