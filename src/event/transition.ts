import { Beginning, Connection, Context, Decision, Input, Output, Termination, Transition } from '../xenocline';
import { createEvent, EventData, type Event } from '../event/event';

export type TransitionEventStage = DecisionEventStage | ConnectionEventStage | TerminationEventStage | BeginningEventStage;

export type TransitionEventType = 'connection' | 'decision' | 'termination' | 'beginning';

/**
 * Base event emitted for any transition.
 */
export interface TransitionEvent<T extends TransitionEventType, S extends TransitionEventStage, P extends Transition = Transition, D extends EventData = EventData> extends Event<D> {
    type: 'transition';
    transitionType: T;
    transition: P;
    stage: S;
}

export const createTransitionEvent = <T extends TransitionEventType, S extends TransitionEventStage, P extends Transition, D extends EventData>(
    sourceId: string,
    transitionType: T,
    stage: S,
    transition: P,
    data?: D
): Readonly<TransitionEvent<T, S, P, D>> => {
    const event = createEvent('transition', sourceId, stage, data);
    return {
        ...event,
        transitionType,
        transition,
    } as TransitionEvent<T, S, P, D>;
};

// Connection Types
export type ConnectionEventStage = 'start' | 'end' | 'transform';

export interface ConnectionEventData extends EventData {
    input?: Input;
    output?: Output;
    context?: Context;
}

export type ConnectionEvent = TransitionEvent<'connection', ConnectionEventStage, Connection, ConnectionEventData>;

export const createConnectionEvent = (sourceId: string, stage: ConnectionEventStage, transition: Connection, data?: ConnectionEventData): Readonly<ConnectionEvent> => {
    return createTransitionEvent(sourceId, 'connection', stage, transition, data);
};

export const isConnectionEvent = (item: any): item is ConnectionEvent => {
    return typeof item === 'object' && item !== null && item.type === 'transition' && item.transitionType === 'connection' && typeof item.transitionType === 'string';
};

// Decision Types
export type DecisionEventStage = 'start' | 'end' | 'decide';

export interface DecisionEventData extends EventData {
    output?: Output;
    result?: any;
}

export type DecisionEvent = TransitionEvent<'decision', DecisionEventStage, Decision, DecisionEventData>;

export const createDecisionEvent = (sourceId: string, stage: DecisionEventStage, transition: Decision, data?: DecisionEventData): Readonly<DecisionEvent> =>
    createTransitionEvent<'decision', DecisionEventStage, Decision, DecisionEventData>(sourceId, 'decision', stage, transition, data);

export const isDecisionEvent = (item: any): item is DecisionEvent => {
    return typeof item === 'object' && item !== null && item.type === 'transition' && item.transitionType === 'decision' && typeof item.transitionType === 'string';
};


// Termination Types
export type TerminationEventStage = 'start' | 'terminate';

export interface TerminationEventData extends EventData {
    output?: Output;
}

export type TerminationEvent = TransitionEvent<'termination', TerminationEventStage, Termination, TerminationEventData>;

export const createTerminationEvent = (sourceId: string, stage: TerminationEventStage, transition: Termination, data?: TerminationEventData): Readonly<TerminationEvent> => {
    return createTransitionEvent(sourceId, 'termination', stage, transition, data);
};

export const isTerminationEvent = (item: any): item is TerminationEvent => {
    return typeof item === 'object' && item !== null && item.type === 'transition' && item.transitionType === 'termination' && typeof item.transitionType === 'string';
};

// Beginning Types
export type BeginningEventStage = 'start' | 'begin';

export interface BeginningEventData extends EventData {
    input?: Input;
}

export type BeginningEvent = TransitionEvent<'beginning', BeginningEventStage, Beginning, BeginningEventData>;

export const createBeginningEvent = <I extends Input, C extends Context>(sourceId: string, stage: BeginningEventStage, transition: Beginning<I, C>, data?: BeginningEventData): Readonly<BeginningEvent> => {
    return createTransitionEvent(sourceId, 'beginning', stage, transition as Beginning<Input, Context>, data);
};

export const isBeginningEvent = (item: any): item is BeginningEvent => {
    return typeof item === 'object' && item !== null && item.type === 'transition' && item.transitionType === 'beginning' && typeof item.transitionType === 'string';
};
