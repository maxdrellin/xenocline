import { Context } from '../context';
import { createAggregatorEvent, EventState } from '../event';
import { Input } from '../input';
import { AggregatorNode } from '../node/aggregatornode';
import { Output } from '../output';
import { dispatchEvent } from './event';

export class Deferred<T> {
    promise: Promise<T>;
    resolve!: (value: T | PromiseLike<T>) => void;
    reject!: (reason?: any) => void;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

export interface AggregatorState {
    aggregatorDeferreds: Map<string, Deferred<Output>>;
    registerPendingAggregator: (nodeId: string) => Deferred<Output>;
    resolvePendingAggregator: (nodeId: string, output: Output) => void;
    getPendingAggregator: (nodeId: string) => Deferred<Output> | undefined;
    pendingAggregatorIds: () => string[];
}

export function createAggregatorState(): AggregatorState {
    return {
        aggregatorDeferreds: new Map<string, Deferred<Output>>(),
        registerPendingAggregator(nodeId: string) {
            let deferred = this.aggregatorDeferreds.get(nodeId);
            if (!deferred) {
                deferred = new Deferred<Output>();
                this.aggregatorDeferreds.set(nodeId, deferred);
            }
            return deferred;
        },
        resolvePendingAggregator(nodeId: string, output: Output) {
            const deferred = this.aggregatorDeferreds.get(nodeId);
            if (deferred) {
                deferred.resolve(output);
                this.aggregatorDeferreds.delete(nodeId);
            }
        },
        getPendingAggregator(nodeId: string) {
            return this.aggregatorDeferreds.get(nodeId);
        },
        pendingAggregatorIds() {
            return Array.from(this.aggregatorDeferreds.keys());
        },
    };
}

export async function executeAggregatorNode(
    nodeId: string,
    node: AggregatorNode,
    input: Input,
    state: AggregatorState & { context: Context, eventState: EventState<Context> }
): Promise<Output> {

    dispatchEvent(
        state.eventState,
        createAggregatorEvent(nodeId, 'start', node.aggregator, { input }),
        state.context
    );

    let deferred = state.getPendingAggregator(nodeId);
    const aggregationResult = await node.aggregator.aggregate(input, state.context);

    dispatchEvent(state.eventState, createAggregatorEvent(nodeId, 'aggregate', node.aggregator, { input, result: aggregationResult }), state.context);

    if (aggregationResult.status === 'Ready') {
        const output = aggregationResult.output;

        dispatchEvent(state.eventState, createAggregatorEvent(nodeId, 'ready', node.aggregator, { output }), state.context);

        state.resolvePendingAggregator(nodeId, output);
        return output;
    }

    dispatchEvent(state.eventState, createAggregatorEvent(nodeId, 'defer', node.aggregator, { input, result: aggregationResult }), state.context);
    deferred = deferred ?? state.registerPendingAggregator(nodeId);
    return deferred.promise;
}
