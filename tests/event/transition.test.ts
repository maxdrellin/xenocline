import { vi } from 'vitest';
import {
    createTransitionEvent,
    createConnectionEvent,
    isConnectionEvent,
    createDecisionEvent,
    isDecisionEvent,
    createTerminationEvent,
    isTerminationEvent,
    createBeginningEvent,
    isBeginningEvent,
} from '../../src/event/transition';
import type { Connection, Decision, Termination, Beginning, Transition } from '../../src/xenocline';

// Mock the date to ensure consistent test results
vi.useFakeTimers();
const mockDate = new Date(2024, 0, 1, 12, 0, 0); // Jan 1, 2024, 12:00:00
vi.setSystemTime(mockDate);

describe('Transition Events', () => {
    const mockSourceId = 'test-source';
    const mockTransition = { id: 'transition-id' } as Transition;
    const mockConnection = { id: 'connection-id' } as Connection;
    const mockDecision = { id: 'decision-id' } as Decision;
    const mockTermination = { id: 'termination-id' } as Termination;
    const mockBeginning = { id: 'beginning-id' } as Beginning;

    describe('createTransitionEvent', () => {
        it('should create a transition event with the correct properties', () => {
            const event = createTransitionEvent(mockSourceId, 'connection', 'start', mockTransition);
            expect(event).toEqual({
                sourceId: mockSourceId,
                type: 'transition',
                transitionType: 'connection',
                stage: 'start',
                transition: mockTransition,
                date: mockDate,
            });
        });
    });

    describe('createConnectionEvent', () => {
        it('should create a connection event with the correct properties', () => {
            const event = createConnectionEvent(mockSourceId, 'end', mockConnection);
            expect(event).toEqual({
                sourceId: mockSourceId,
                type: 'transition',
                transitionType: 'connection',
                stage: 'end',
                transition: mockConnection,
                date: mockDate,
            });
        });
    });

    describe('isConnectionEvent', () => {
        it('should return true for a valid connection event', () => {
            const event = createConnectionEvent(mockSourceId, 'start', mockConnection);
            expect(isConnectionEvent(event)).toBe(true);
        });

        it('should return false for an invalid event', () => {
            expect(isConnectionEvent({ type: 'other' })).toBe(false);
            expect(isConnectionEvent({ type: 'transition', transitionType: 'decision' })).toBe(false);
            expect(isConnectionEvent(null)).toBe(false);
            expect(isConnectionEvent(undefined)).toBe(false);
        });
    });

    describe('createDecisionEvent', () => {
        it('should create a decision event with the correct properties', () => {
            const event = createDecisionEvent(mockSourceId, 'start', mockDecision);
            expect(event).toEqual({
                sourceId: mockSourceId,
                type: 'transition',
                transitionType: 'decision',
                stage: 'start',
                transition: mockDecision,
                date: mockDate,
            });
        });
    });

    describe('isDecisionEvent', () => {
        it('should return true for a valid decision event', () => {
            const event = createDecisionEvent(mockSourceId, 'end', mockDecision);
            expect(isDecisionEvent(event)).toBe(true);
        });

        it('should return false for an invalid event', () => {
            expect(isDecisionEvent({ type: 'other' })).toBe(false);
            expect(isDecisionEvent({ type: 'transition', transitionType: 'connection' })).toBe(false);
            expect(isDecisionEvent(null)).toBe(false);
            expect(isDecisionEvent(undefined)).toBe(false);
        });
    });

    describe('createTerminationEvent', () => {
        it('should create a termination event with the correct properties', () => {
            const event = createTerminationEvent(mockSourceId, 'terminate', mockTermination);
            expect(event).toEqual({
                sourceId: mockSourceId,
                type: 'transition',
                transitionType: 'termination',
                stage: 'terminate',
                transition: mockTermination,
                date: mockDate,
            });
        });
    });

    describe('isTerminationEvent', () => {
        it('should return true for a valid termination event', () => {
            const event = createTerminationEvent(mockSourceId, 'start', mockTermination);
            expect(isTerminationEvent(event)).toBe(true);
        });

        it('should return false for an invalid event', () => {
            expect(isTerminationEvent({ type: 'other' })).toBe(false);
            expect(isTerminationEvent({ type: 'transition', transitionType: 'decision' })).toBe(false);
            expect(isTerminationEvent(null)).toBe(false);
            expect(isTerminationEvent(undefined)).toBe(false);
        });
    });

    describe('createBeginningEvent', () => {
        it('should create a beginning event with the correct properties', () => {
            const event = createBeginningEvent(mockSourceId, 'start', mockBeginning);
            expect(event).toEqual({
                sourceId: mockSourceId,
                type: 'transition',
                transitionType: 'beginning',
                stage: 'start',
                transition: mockBeginning,
                date: mockDate,
            });
        });
    });

    describe('isBeginningEvent', () => {
        it('should return true for a valid beginning event', () => {
            const event = createBeginningEvent(mockSourceId, 'begin', mockBeginning);
            expect(isBeginningEvent(event)).toBe(true);
        });

        it('should return false for an invalid event', () => {
            expect(isBeginningEvent({ type: 'other' })).toBe(false);
            expect(isBeginningEvent({ type: 'transition', transitionType: 'connection' })).toBe(false);
            expect(isBeginningEvent(null)).toBe(false);
            expect(isBeginningEvent(undefined)).toBe(false);
        });
    });

    // More tests will be added here
});

// Restore timers after all tests
afterAll(() => {
    vi.useRealTimers();
});
