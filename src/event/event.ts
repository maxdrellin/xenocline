export type EventType = 'process' | 'phase' | 'transition' | 'execution' | 'aggregator';

export type EventStage = string;


export interface EventData {
    [key: string]: unknown;
}

export interface Event<D extends EventData = EventData> {
    date: Date;
    type: string;
    stage: EventStage;
    sourceId: string;
    data?: D;
}

export const createEvent = <D extends EventData>(type: string, sourceId: string, stage: EventStage, data?: D): Event<D> => {
    return {
        date: new Date(),
        type,
        stage,
        sourceId,
        data,
    };
};

export const isEvent = (item: unknown): item is Event => {
    return item !== null && item !== undefined && typeof item === 'object' && 'date' in item && 'type' in item && 'sourceId' in item;
};
