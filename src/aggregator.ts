import { clean } from "./util/general";
import { Context } from "./context";
import { Input } from "./input";
import { Output } from "./output";

/**
 * Defines the possible outcomes of an aggregation operation.
 * It can either be 'Ready' with an output, or 'NotYetReady'.
 */
export type AggregationResult<U extends Output = Output> =
    | { status: 'Ready'; output: U }
    | { status: 'NotYetReady' };

/**
 * Aggregation method that processes inputs and returns an aggregation result.
 *
 * IMPORTANT: Aggregators should store their state in the context, not in
 * module-level or closure variables, to ensure proper isolation between
 * concurrent process executions.
 *
 * Pattern:
 * ```typescript
 * const aggregator = createAggregator('MyAgg', {
 *   aggregate: async (input, context) => {
 *     if (!context.myAggState) {
 *       context.myAggState = { count: 0, accumulated: 0 };
 *     }
 *     const state = context.myAggState;
 *     state.count++;
 *     state.accumulated += input.value;
 *     if (state.count === 2) {
 *       return { status: 'Ready', output: { result: state.accumulated } };
 *     }
 *     return { status: 'NotYetReady' };
 *   }
 * });
 * ```
 */
export type AggregateMethod<U extends Output = Output, C extends Context = Context> = (
    input: Input,
    context: C
) => Promise<Readonly<AggregationResult<U>>>;


export interface Aggregator<U extends Output = Output, C extends Context = Context> {
    name: string;
    aggregate: AggregateMethod<U, C>;
}

export interface AggregatorOptions<U extends Output = Output, C extends Context = Context> {
    aggregate: AggregateMethod<U, C>;
}

export const DEFAULT_AGGREGATOR_OPTIONS: AggregatorOptions<Output, Context> = {
    aggregate: async (input) => {
        return { status: 'Ready', output: input };
    }
}

export const createAggregator = <U extends Output = Output, C extends Context = Context>(
    name: string,
    options?: Partial<AggregatorOptions<U, C>>
): Readonly<Aggregator<U, C>> => {
    let aggregatorOptions: AggregatorOptions<U, C> = { ...DEFAULT_AGGREGATOR_OPTIONS } as unknown as AggregatorOptions<U, C>;
    if (options) {
        aggregatorOptions = { ...aggregatorOptions, ...clean(options) };
    }

    return { name, aggregate: aggregatorOptions.aggregate };
}

export const isAggregator = <U extends Output = Output>(obj: any): obj is Aggregator<U> => {
    return obj !== undefined && obj !== null && typeof obj === 'object' && typeof obj.name === 'string' && typeof obj.aggregate === 'function';
}

export const validateAggregator = (item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const currentCoordinates = [...(coordinates || []), 'Aggregator'];

    if (item === undefined || item === null) {
        errors.push({ coordinates: [...currentCoordinates], error: 'Aggregator is undefined or null.' });
        return errors;
    }

    if (item.name === undefined || typeof item.name !== 'string') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Aggregator name is undefined or not a string.' });
    }

    currentCoordinates.push(`Aggregator: ${item.name}`);

    if (item.aggregate === undefined || typeof item.aggregate !== 'function') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Aggregator aggregate is undefined or not a function.' });
    }

    return errors;
}
