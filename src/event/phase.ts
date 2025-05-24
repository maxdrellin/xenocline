import { Input, Output, Phase } from '../xenocline';
import { createEvent, Event, EventData } from './event';

export type PhaseEventStage = 'start' | 'execute';

export interface PhaseEvent<P extends Phase = Phase, S extends PhaseEventStage = PhaseEventStage, D extends EventData = EventData> extends Event<D> {
    type: 'phase';
    phase: P;
    stage: S;
    data?: D;
}

export interface PhaseEventData extends EventData {
    input?: Input;
    output?: Output;
}

export function createPhaseEvent<P extends Phase, S extends PhaseEventStage = PhaseEventStage, D extends EventData = EventData>(
    sourceId: string,
    stage: S,
    phase: P,
    data?: D
): PhaseEvent<P, S, D> {
    const event = createEvent('phase', sourceId, stage, data);
    return {
        ...event,
        phase,
    } as PhaseEvent<P, S, D>;
}

export function isPhaseEvent<P extends Phase>(event: any): event is PhaseEvent<P> {
    return (
        event !== null &&
        event !== undefined &&
        typeof event === 'object' &&
        event.type === 'phase' &&
        event.phase !== null &&
        event.phase !== undefined &&
        event.stage !== null &&
        event.stage !== undefined &&
        typeof event.stage === 'string' &&
        ['start', 'execute'].includes(event.stage)
    );

}
