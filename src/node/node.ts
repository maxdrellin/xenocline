import { clean } from "../util/general";
import { Context } from "../context";
import { Output } from "../output";
import { isNext, Next, validateNext } from "../transition/next";

export interface Node<O extends Output = Output, C extends Context = Context> {
    id: string;
    type: 'aggregator' | 'phase';

    // The next step can be a direct termination, a list of connections, or a list of decisions,
    // all based on the output O of this aggregator node.  Note that next can be undefined, when that happens 
    // a termination transition is assumed.
    next?: Next<O, C>;
}

export interface NodeOptions<O extends Output = Output, C extends Context = Context> {
    next?: Next<O, C>;
}

export const DEFAULT_NODE_OPTIONS: NodeOptions<Output, Context> = {
}

export const createNode = <O extends Output = Output, C extends Context = Context>(type: 'aggregator' | 'phase', id: string, options?: Partial<NodeOptions<O, C>>): Readonly<Node<O, C>> => {
    let nodeOptions: NodeOptions<O, C> = { ...DEFAULT_NODE_OPTIONS } as unknown as NodeOptions<O, C>;
    if (options) {
        nodeOptions = { ...nodeOptions, ...clean(options) };
    }

    return {
        id,
        type,
        next: nodeOptions.next,
    };
};

export const isNode = (item: any): item is Node => {
    return item !== null && typeof item === 'object' && typeof item.id === 'string' && (item.type === 'aggregator' || item.type === 'phase') && (item.next === undefined || isNext(item.next));
};

export const validateNode = (item: any, coordinates?: string[]): Array<{ coordinates: string[], error: string }> => {
    const errors: Array<{ coordinates: string[], error: string }> = [];
    const currentCoordinates = [...(coordinates || []), 'Node'];


    if (item === undefined || item === null) {
        errors.push({ coordinates: [...currentCoordinates], error: 'Node is undefined or null.' });
        return errors;
    }

    if (typeof item !== 'object') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Node is not an object.' });
        return errors;
    }

    if (item.id === undefined || typeof item.id !== 'string') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Node id is undefined or not a string.' });
    }

    if (item.type === undefined || typeof item.type !== 'string') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Node type is undefined or not a string.' });
    }

    if (item.type !== 'aggregator' && item.type !== 'phase') {
        errors.push({ coordinates: [...currentCoordinates], error: 'Node type is not a valid type.' });
    }

    currentCoordinates.push(`Node: ${item.id}`);

    if (item.next !== undefined) {
        errors.push(...validateNext(item.next, currentCoordinates));
    }

    return errors;
}