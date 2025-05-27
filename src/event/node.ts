import { createEvent, EventData, type Event } from '../event/event';
import { AggregatorNode, Input, Node, Output, PhaseNode } from '../xenocline';

export type NodeEventStage = AggregatorNodeEventStage | PhaseNodeEventStage;

// For now, a generic 'node' type. This can be expanded if different types of nodes emit different events.
export type NodeEventType = 'aggregator' | 'phase';

/**
 * Base event emitted for any node.
 */
export interface NodeEvent<T extends NodeEventType = NodeEventType, S extends NodeEventStage = NodeEventStage, N extends Node = Node, D extends EventData = EventData> extends Event<D> {
    type: 'node'; // Overrides the base Event type
    nodeType: T;
    node: N;
    stage: S;
    data?: D;
}

export const createNodeEvent = <T extends NodeEventType, S extends NodeEventStage, N extends Node, D extends EventData>(sourceId: string, nodeType: T, stage: S, node: N, data?: D): Readonly<NodeEvent<T, S, N, D>> => {
    const event = createEvent('node', sourceId, stage, data);
    return {
        ...event,
        nodeType,
        node,
    } as NodeEvent<T, S, N, D>;
};

export const isNodeEvent = (item: any): item is NodeEvent => {
    return item !== null && item !== undefined && typeof item === 'object' && item.type === 'node' && item.node !== null && item.node !== undefined && item.stage !== null && item.stage !== undefined;
};

// Aggregator Node Types
export type AggregatorNodeEventStage = 'start' | 'end';

export interface AggregatorEventData extends EventData {
    input?: Input;
    output?: Output;
}

export interface AggregatorNodeEvent<A extends AggregatorNode = AggregatorNode> extends NodeEvent<'aggregator', AggregatorNodeEventStage, A, AggregatorEventData> {
    nodeType: 'aggregator';
    node: A;
    data?: AggregatorEventData;
}

export const createAggregatorNodeEvent = <A extends AggregatorNode>(sourceId: string, stage: AggregatorNodeEventStage, aggregatorNode: A, data?: AggregatorEventData): AggregatorNodeEvent<A> => createNodeEvent(sourceId, 'aggregator', stage, aggregatorNode, data);

export const isAggregatorNodeEvent = (item: any): item is AggregatorNodeEvent => {
    return isNodeEvent(item) && item.nodeType === 'aggregator';
};

// Phase Node Types
export type PhaseNodeEventStage = 'start' | 'prepared' | 'processed' | 'end';

export interface PhaseEventData extends EventData {
    input?: Input;
    output?: Output;
}

export interface PhaseNodeEvent<P extends PhaseNode = PhaseNode> extends NodeEvent<'phase', PhaseNodeEventStage, P, PhaseEventData> {
    nodeType: 'phase';
    node: P;
    data?: PhaseEventData;
}

export const createPhaseNodeEvent = <P extends PhaseNode>(sourceId: string, stage: PhaseNodeEventStage, phaseNode: P, data?: PhaseEventData): PhaseNodeEvent<P> => createNodeEvent(sourceId, 'phase', stage, phaseNode, data);

export const isPhaseNodeEvent = (item: any): item is PhaseNodeEvent => {
    return isNodeEvent(item) && item.nodeType === 'phase';
};

