import { createEvent, EventData, type Event } from './event'; // Assuming Event is in the same directory or adjust path
import type { Process } from '../process'; // Assuming Process is in '../process' or adjust path
import { Context } from 'vm';

export type ProcessEventStage = 'start' | 'end';

export interface ProcessEvent<
    Proc extends Process = Process,
    C extends Context = Context,
> extends Event<ProcessEventData<C>> {
    type: 'process'; // Overrides the base Event type
    process: Proc; // The actual process instance or its identifier
    stage: ProcessEventStage;
}

export interface ProcessEventData<C extends Context = Context> extends EventData {
    context?: C;
}

export const createProcessEvent = <
    Proc extends Process,
    C extends Context = Context,
>(sourceId: string, stage: ProcessEventStage, process: Proc, data?: ProcessEventData<C>): Readonly<ProcessEvent<Proc, C>> => {
    const event = createEvent('process', sourceId, stage, data);
    return {
        ...event,
        process,
    } as ProcessEvent<Proc, C>;
};

export const isProcessEvent = (item: any): item is ProcessEvent => {
    return (
        item !== null &&
        item !== undefined &&
        typeof item === 'object' &&
        item.type === 'process' &&
        item.process !== null &&
        item.process !== undefined &&
        item.stage !== null &&
        item.stage !== undefined
    );
};