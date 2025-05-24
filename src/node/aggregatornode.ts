import { Aggregator, validateAggregator } from '../aggregator';
import { Next } from '../transition/next';
import { Context } from '../context';
import { Output } from '../output';
import { createNode, isNode, Node, validateNode } from './node';
import { clean } from '../util/general';

/**
 * Represents a node in the process that aggregates multiple inputs of type IA
 * into a single output of type O.
 *
 * @template O - The type of the output produced by this node's aggregate function. Must extend Output.
 * @template C - The type of the context object passed to the aggregate function. Must extend Context.
 */
export interface AggregatorNode<
    O extends Output = Output,   // Output from the aggregate function
    C extends Context = Context, // Context object
> extends Node<O, C> { // MODIFIED: Extends Node
    type: 'aggregator'; // Overrides Node.type
    // id: string; // Unique identifier for this aggregator node within the process - inherited from Node

    /**
     * The core aggregation logic for this node.
     * It takes an array of input items and a context, and returns a Promise resolving to the aggregated output.
     * @param input - An input item of type Input.
     * @param context - The context object.
     * @returns A Promise that resolves to the aggregated output of type O.
     */
    aggregator: Aggregator<O, C>;
}

export interface AggregatorNodeOptions<O extends Output = Output, C extends Context = Context> {
    next?: Next<O, C>;
}

export const DEFAULT_AGGREGATOR_NODE_OPTIONS: AggregatorNodeOptions<Output, Context> = {
}

export const createAggregatorNode = <O extends Output = Output, C extends Context = Context>(
    id: string,
    aggregator: Aggregator<O, C>,
    options?: Partial<AggregatorNodeOptions<O, C>>
): Readonly<AggregatorNode<O, C>> => {
    let aggregatorNodeOptions: AggregatorNodeOptions<O, C> = { ...DEFAULT_AGGREGATOR_NODE_OPTIONS } as unknown as AggregatorNodeOptions<O, C>;
    if (options) {
        aggregatorNodeOptions = { ...aggregatorNodeOptions, ...clean(options) };
    }

    return {
        ...createNode('aggregator', id, { next: aggregatorNodeOptions.next }),
        aggregator,
    } as AggregatorNode<O, C>;
};


/**
 * Type guard to check if an object is an AggregatorNode.
 *
 * @param obj - The object to check.
 * @returns True if the object is an AggregatorNode, false otherwise.
 */
export const isAggregatorNode = (obj: any): obj is AggregatorNode<any, any> => {
    if (!isNode(obj) || obj.type !== 'aggregator') {
        return false;
    }

    // At this point, obj is a Node with type 'aggregator'.
    // Now check for AggregatorNode specific properties.
    const potentialAggNode = obj as AggregatorNode<any, any>; // Cast to access specific props

    if (!(
        typeof potentialAggNode.aggregator === 'object' && potentialAggNode.aggregator !== null && typeof potentialAggNode.aggregator.aggregate === 'function'
    )) {
        return false;
    }

    return true; // Not Termination and not a recognized array type for 'next'
};

export const validateAggregatorNode = (item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const currentCoordinates = [...(coordinates || []), 'AggregatorNode'];

    errors.push(...validateNode(item, currentCoordinates));

    currentCoordinates.push(`AggregatorNode: ${item.id}`);

    if (item.aggregator === undefined) {
        errors.push({ coordinates: [...currentCoordinates], error: 'aggregator is undefined.' });
    } else {
        errors.push(...validateAggregator(item.aggregator, currentCoordinates));
    }

    return errors;
};