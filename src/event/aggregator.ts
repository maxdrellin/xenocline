import { createEvent, Event, EventData } from './event'; // Assuming a base Event interface exists
import { AggregationResult, Aggregator, Input, Output } from '../xenocline';

export type AggregatorEventStage = 'start' | 'aggregate' | 'ready' | 'defer';

export interface AggregatorEvent<A extends Aggregator = Aggregator, S extends AggregatorEventStage = AggregatorEventStage, D extends AggregatorEventData = AggregatorEventData> extends Event<D> {
    type: 'aggregator';
    stage: S;
    aggregator: A; // Optional payload for the aggregator event
    data?: D;
}

export interface AggregatorEventData extends EventData {
    input?: Input;
    output?: Output;
    result?: Readonly<AggregationResult<Output>>;
}

export function createAggregatorEvent<A extends Aggregator = Aggregator, S extends AggregatorEventStage = AggregatorEventStage, D extends AggregatorEventData = AggregatorEventData>(
    sourceId: string,
    stage: S,
    aggregator: A,
    data?: D
): AggregatorEvent<A, S, D> {
    const event = createEvent('aggregator', sourceId, stage, data);
    return {
        ...event,
        aggregator,
    } as AggregatorEvent<A, S, D>;
}

export function isAggregatorEvent<A extends Aggregator = Aggregator, S extends AggregatorEventStage = AggregatorEventStage, D extends AggregatorEventData = AggregatorEventData>(event: any): event is AggregatorEvent<A, S, D> {
    if (event === null || event === undefined || typeof event !== 'object') {
        return false;
    }

    const hasRequiredProperties = event.type === 'aggregator' &&
        'stage' in event &&
        'aggregator' in event &&
        typeof event.aggregator === 'object' &&
        event.aggregator !== null &&
        'name' in event.aggregator;

    if (!hasRequiredProperties) {
        return false;
    }

    const aggregatorEvent = event as AggregatorEvent<A, S, D>;
    const isValidStage = ['start', 'aggregate', 'ready', 'defer'].includes(aggregatorEvent.stage);

    return isValidStage;
}
